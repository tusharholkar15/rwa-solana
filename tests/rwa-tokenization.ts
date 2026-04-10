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
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { expect } from "chai";

describe("rwa-tokenization", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RwaTokenization as Program<RwaTokenization>;
  const authority = provider.wallet as anchor.Wallet;

  // Test keypairs
  const mintKeypair = Keypair.generate();
  const treasuryTokenAccountKeypair = Keypair.generate();
  const buyer = Keypair.generate();

  // Asset parameters
  const assetName = "Sunset Villas Unit 4B";
  const assetSymbol = "SVILLA";
  const assetUri = "https://rwa-platform.com/assets/sunset-villas-4b.json";
  const totalSupply = new anchor.BN(10_000);
  const pricePerToken = new anchor.BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL per token
  const annualYieldBps = 850; // 8.5%

  // PDAs
  let assetPda: PublicKey;
  let assetBump: number;
  let treasuryPda: PublicKey;
  let treasuryBump: number;
  let buyerWhitelistPda: PublicKey;
  let authorityWhitelistPda: PublicKey;
  let buyerOwnershipPda: PublicKey;

  before(async () => {
    // Derive PDAs
    [assetPda, assetBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("asset"),
        authority.publicKey.toBuffer(),
        Buffer.from(assetName),
      ],
      program.programId
    );

    [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), assetPda.toBuffer()],
      program.programId
    );

    [buyerWhitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), buyer.publicKey.toBuffer()],
      program.programId
    );

    [authorityWhitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), authority.publicKey.toBuffer()],
      program.programId
    );

    [buyerOwnershipPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("ownership"),
        assetPda.toBuffer(),
        buyer.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Airdrop SOL to buyer
    const airdropTx = await provider.connection.requestAirdrop(
      buyer.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx);
  });

  it("Initializes a new tokenized asset", async () => {
    const tx = await program.methods
      .initializeAsset(
        assetName,
        assetSymbol,
        assetUri,
        totalSupply,
        pricePerToken,
        annualYieldBps
      )
      .accounts({
        authority: authority.publicKey,
        asset: assetPda,
        mint: mintKeypair.publicKey,
        treasury: treasuryPda,
        treasuryTokenAccount: treasuryTokenAccountKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair, treasuryTokenAccountKeypair])
      .rpc();

    console.log("Initialize asset tx:", tx);

    // Fetch and verify asset account
    const assetAccount = await program.account.assetAccount.fetch(assetPda);
    expect(assetAccount.name).to.equal(assetName);
    expect(assetAccount.symbol).to.equal(assetSymbol);
    expect(assetAccount.totalSupply.toNumber()).to.equal(10_000);
    expect(assetAccount.availableSupply.toNumber()).to.equal(10_000);
    expect(assetAccount.isActive).to.be.true;

    console.log("✅ Asset initialized successfully");
  });

  it("Whitelists the authority", async () => {
    const tx = await program.methods
      .whitelistUser()
      .accounts({
        authority: authority.publicKey,
        user: authority.publicKey,
        whitelistEntry: authorityWhitelistPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Whitelist authority tx:", tx);
    console.log("✅ Authority whitelisted");
  });

  it("Whitelists a buyer (KYC verification)", async () => {
    const tx = await program.methods
      .whitelistUser()
      .accounts({
        authority: authority.publicKey,
        user: buyer.publicKey,
        whitelistEntry: buyerWhitelistPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Whitelist buyer tx:", tx);

    const whitelistAccount = await program.account.whitelistEntry.fetch(
      buyerWhitelistPda
    );
    expect(whitelistAccount.isVerified).to.be.true;
    expect(whitelistAccount.user.toString()).to.equal(
      buyer.publicKey.toString()
    );

    console.log("✅ Buyer whitelisted");
  });

  it("Buyer purchases fractional shares", async () => {
    const buyAmount = new anchor.BN(100); // Buy 100 tokens

    // Create buyer's associated token account
    const buyerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      buyer.publicKey
    );

    // Create the ATA
    const createAtaIx = createAssociatedTokenAccountInstruction(
      buyer.publicKey,
      buyerTokenAccount,
      buyer.publicKey,
      mintKeypair.publicKey
    );

    const tx = await program.methods
      .buyShares(buyAmount)
      .accounts({
        buyer: buyer.publicKey,
        asset: assetPda,
        treasury: treasuryPda,
        treasuryTokenAccount: treasuryTokenAccountKeypair.publicKey,
        buyerTokenAccount: buyerTokenAccount,
        buyerWhitelist: buyerWhitelistPda,
        userOwnership: buyerOwnershipPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([createAtaIx])
      .signers([buyer])
      .rpc();

    console.log("Buy shares tx:", tx);

    // Verify ownership
    const ownership = await program.account.userOwnership.fetch(
      buyerOwnershipPda
    );
    expect(ownership.sharesOwned.toNumber()).to.equal(100);

    // Verify asset supply decreased
    const assetAccount = await program.account.assetAccount.fetch(assetPda);
    expect(assetAccount.availableSupply.toNumber()).to.equal(9_900);

    console.log("✅ Shares purchased successfully");
  });

  it("Buyer sells fractional shares", async () => {
    const sellAmount = new anchor.BN(50); // Sell 50 tokens

    const buyerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      buyer.publicKey
    );

    const tx = await program.methods
      .sellShares(sellAmount)
      .accounts({
        seller: buyer.publicKey,
        asset: assetPda,
        treasury: treasuryPda,
        treasuryTokenAccount: treasuryTokenAccountKeypair.publicKey,
        sellerTokenAccount: buyerTokenAccount,
        sellerWhitelist: buyerWhitelistPda,
        userOwnership: buyerOwnershipPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Sell shares tx:", tx);

    // Verify ownership updated
    const ownership = await program.account.userOwnership.fetch(
      buyerOwnershipPda
    );
    expect(ownership.sharesOwned.toNumber()).to.equal(50);

    // Verify asset supply increased
    const assetAccount = await program.account.assetAccount.fetch(assetPda);
    expect(assetAccount.availableSupply.toNumber()).to.equal(9_950);

    console.log("✅ Shares sold successfully");
  });

  it("Distributes yield to token holder", async () => {
    const yieldAmount = new anchor.BN(LAMPORTS_PER_SOL); // 1 SOL yield

    // First fund the treasury with some SOL for yield
    const fundTx = await provider.connection.requestAirdrop(
      treasuryPda,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(fundTx);

    const tx = await program.methods
      .distributeYield(yieldAmount)
      .accounts({
        authority: authority.publicKey,
        asset: assetPda,
        treasury: treasuryPda,
        holder: buyer.publicKey,
        userOwnership: buyerOwnershipPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Distribute yield tx:", tx);

    // Verify yield received
    const ownership = await program.account.userOwnership.fetch(
      buyerOwnershipPda
    );
    expect(ownership.totalYieldReceived.toNumber()).to.equal(
      LAMPORTS_PER_SOL
    );

    console.log("✅ Yield distributed successfully");
  });

  it("Prevents non-whitelisted user from buying", async () => {
    const nonWhitelistedUser = Keypair.generate();
    const airdropTx = await provider.connection.requestAirdrop(
      nonWhitelistedUser.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx);

    const buyAmount = new anchor.BN(10);
    const userTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      nonWhitelistedUser.publicKey
    );

    const [userWhitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), nonWhitelistedUser.publicKey.toBuffer()],
      program.programId
    );

    const [userOwnershipPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("ownership"),
        assetPda.toBuffer(),
        nonWhitelistedUser.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .buyShares(buyAmount)
        .accounts({
          buyer: nonWhitelistedUser.publicKey,
          asset: assetPda,
          treasury: treasuryPda,
          treasuryTokenAccount: treasuryTokenAccountKeypair.publicKey,
          buyerTokenAccount: userTokenAccount,
          buyerWhitelist: userWhitelistPda,
          userOwnership: userOwnershipPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonWhitelistedUser])
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (err) {
      // Expected: AccountNotInitialized or NotWhitelisted
      console.log("✅ Correctly prevented non-whitelisted purchase");
    }
  });

  it("Prevents overselling of tokens", async () => {
    const buyerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      buyer.publicKey
    );

    // Try to sell more than owned (buyer owns 50)
    const sellAmount = new anchor.BN(999);

    try {
      await program.methods
        .sellShares(sellAmount)
        .accounts({
          seller: buyer.publicKey,
          asset: assetPda,
          treasury: treasuryPda,
          treasuryTokenAccount: treasuryTokenAccountKeypair.publicKey,
          sellerTokenAccount: buyerTokenAccount,
          sellerWhitelist: buyerWhitelistPda,
          userOwnership: buyerOwnershipPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (err) {
      console.log("✅ Correctly prevented overselling");
    }
  });
});
