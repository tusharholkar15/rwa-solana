import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RwaTokenization } from "../target/types/rwa_tokenization";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Yield Harvesting Integration", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.RwaTokenization as unknown as Program<RwaTokenization>;
    const authority = provider.wallet as anchor.Wallet;

    // Accounts
    const assetName = "Yield Asset " + Math.floor(Math.random() * 1000);
    const mint = Keypair.generate();
    const harvester = Keypair.generate();
    const user = Keypair.generate();

    let assetPda: PublicKey;
    let treasuryPda: PublicKey;
    let poolPda: PublicKey;
    let ownershipPda: PublicKey;
    let whitelistPda: PublicKey;
    let configPda: PublicKey;

    before(async () => {
        // Derive PDAs
        [assetPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("asset"), authority.publicKey.toBuffer(), Buffer.from(assetName)],
            program.programId
        );
        [treasuryPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury"), assetPda.toBuffer()],
            program.programId
        );
        [poolPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("liquidity_pool"), assetPda.toBuffer()],
            program.programId
        );
        [ownershipPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("ownership"), assetPda.toBuffer(), user.publicKey.toBuffer()],
            program.programId
        );
        [whitelistPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("whitelist"), user.publicKey.toBuffer()],
            program.programId
        );
        [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        );

        // Airdrops
        const airdrops = [
            provider.connection.requestAirdrop(user.publicKey, 10 * LAMPORTS_PER_SOL),
            provider.connection.requestAirdrop(harvester.publicKey, LAMPORTS_PER_SOL),
        ];
        await Promise.all(airdrops.map(async (a) => await provider.connection.confirmTransaction(await a)));
    });

    it("Sets up platform and triggers auto-compounding", async () => {
        // 1. Initialize Config (if not already init)
        try {
            await program.methods
                .initializeConfig(10, 60) // 0.1% fee, 60s staleness
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
        } catch (e) {
            console.log("Config already initialized");
        }

        // 2. Initialize Asset
        const treasuryTokens = Keypair.generate();
        const historyPda = PublicKey.findProgramAddressSync([Buffer.from("price_history"), assetPda.toBuffer()], program.programId)[0];
        const breakerPda = PublicKey.findProgramAddressSync([Buffer.from("circuit_breaker"), assetPda.toBuffer()], program.programId)[0];

        await program.methods
            .initializeAsset(assetName, "YIELD", "uri", new anchor.BN(10000), new anchor.BN(LAMPORTS_PER_SOL / 10), 1000)
            .accounts({
                authority: authority.publicKey,
                asset: assetPda,
                mint: mint.publicKey,
                treasury: treasuryPda,
                treasuryTokenAccount: treasuryTokens.publicKey,
                priceHistory: historyPda,
                circuitBreaker: breakerPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([mint, treasuryTokens])
            .rpc();

        // 3. Create Pool
        const lpMint = Keypair.generate();
        const authLpAccount = Keypair.generate();
        const poolTokenAccount = Keypair.generate();
        const authTokens = await getAssociatedTokenAddress(mint.publicKey, authority.publicKey);

        // Mint some tokens to authority first to seed pool
        await program.methods
            .buyShares(new anchor.BN(2000))
            .accounts({
                buyer: authority.publicKey,
                asset: assetPda,
                treasury: treasuryPda,
                treasuryTokenAccount: treasuryTokens.publicKey,
                buyerTokenAccount: authTokens,
                buyerWhitelist: PublicKey.findProgramAddressSync([Buffer.from("whitelist"), authority.publicKey.toBuffer()], program.programId)[0],
                userOwnership: PublicKey.findProgramAddressSync([Buffer.from("ownership"), assetPda.toBuffer(), authority.publicKey.toBuffer()], program.programId)[0],
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        await program.methods
            .createPool(new anchor.BN(1000), new anchor.BN(10 * LAMPORTS_PER_SOL), 100)
            .accounts({
                authority: authority.publicKey,
                asset: assetPda,
                pool: poolPda,
                lpMint: lpMint.publicKey,
                authorityTokenAccount: authTokens,
                poolTokenAccount: poolTokenAccount.publicKey,
                authorityLpAccount: authLpAccount.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([lpMint, authLpAccount, poolTokenAccount])
            .rpc();

        console.log("✅ Platform, Asset, and Pool initialized");

        // 4. Set Compounding Preference
        await program.methods
            .setCompoundingPreference(true, new anchor.BN(LAMPORTS_PER_SOL / 100))
            .accounts({
                owner: user.publicKey,
                ownership: ownershipPda,
            })
            .signers([user])
            .rpc();

        console.log("✅ Auto-compounding enabled for user");

        // 5. Fund Yield
        await program.methods
            .fundYield(new anchor.BN(LAMPORTS_PER_SOL)) // 1 SOL yield
            .accounts({
                authority: authority.publicKey,
                asset: assetPda,
                treasury: treasuryPda,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        
        console.log("✅ Global yield funded");

        // 6. Compound Yield (Harvester triggering)
        // We'll use the harvester wallet
        await program.methods
            .compoundYield()
            .accounts({
                harvester: harvester.publicKey,
                config: configPda,
                asset: assetPda,
                pool: poolPda,
                treasury: treasuryPda,
                ownership: ownershipPda,
                owner: user.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([harvester])
            .rpc();

        // 7. Verify Results
        const updatedOwnership = await program.account.userOwnership.fetch(ownershipPda);
        expect(updatedOwnership.sharesOwned.toNumber()).to.be.greaterThan(0);
        console.log("✅ Compound successful: New shares credited to user");
    });
});
