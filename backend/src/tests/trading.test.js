const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Asset = require('../models/Asset');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');

describe('Trading API Endpoints', () => {
    let testAsset;
    const testWallet = 'trade-wallet-' + Date.now();

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-solana-test');
        }

        // Setup: Approved user
        await User.create({
            walletAddress: testWallet,
            kycStatus: 'approved',
            isWhitelisted: true
        });

        // Setup: Active Asset
        testAsset = await Asset.create({
            name: 'Test Property',
            symbol: 'TPRP',
            description: 'Test description',
            propertyValue: 1000000,
            totalSupply: 10000,
            availableSupply: 10000,
            pricePerToken: 100, // 100 lamports
            annualYieldBps: 500,
            authority: 'admin',
            status: 'active',
            isActive: true
        });
    });

    after(async () => {
        await User.deleteMany({ walletAddress: testWallet });
        await Asset.findByIdAndDelete(testAsset._id);
        await Portfolio.deleteMany({ walletAddress: testWallet });
        await Transaction.deleteMany({ walletAddress: testWallet });
    });

    it('POST /api/buy - should successfully buy shares', async () => {
        const buyAmount = 50;
        const res = await request(app)
            .post('/api/buy')
            .send({
                assetId: testAsset._id,
                shares: buyAmount,
                walletAddress: testWallet
            });

        expect(res.status).to.equal(200);
        expect(res.body.message).to.equal('Purchase successful');
        expect(res.body.transaction.shares).to.equal(buyAmount);

        // Verify state
        const updatedAsset = await Asset.findById(testAsset._id);
        expect(updatedAsset.availableSupply).to.equal(9950);

        const portfolio = await Portfolio.findOne({ walletAddress: testWallet });
        expect(portfolio.holdings[0].shares).to.equal(50);
        expect(portfolio.holdings[0].assetId.toString()).to.equal(testAsset._id.toString());
    });

    it('POST /api/sell - should successfully sell shares', async () => {
        const sellAmount = 20;
        const res = await request(app)
            .post('/api/sell')
            .send({
                assetId: testAsset._id,
                shares: sellAmount,
                walletAddress: testWallet
            });

        expect(res.status).to.equal(200);
        expect(res.body.message).to.equal('Sale successful');
        expect(res.body.transaction.shares).to.equal(sellAmount);

        // Verify state
        const updatedAsset = await Asset.findById(testAsset._id);
        expect(updatedAsset.availableSupply).to.equal(9970); // 9950 + 20

        const portfolio = await Portfolio.findOne({ walletAddress: testWallet });
        expect(portfolio.holdings[0].shares).to.equal(30); // 50 - 20
    });

    it('POST /api/buy - should fail if KYC not approved', async () => {
        const unverifiedWallet = 'unverified-' + Date.now();
        await User.create({ walletAddress: unverifiedWallet, kycStatus: 'pending' });

        const res = await request(app)
            .post('/api/buy')
            .send({
                assetId: testAsset._id,
                shares: 10,
                walletAddress: unverifiedWallet
            });

        expect(res.status).to.equal(403);
        expect(res.body.error).to.contain('KYC verification required');

        await User.deleteMany({ walletAddress: unverifiedWallet });
    });

    it('POST /api/sell - should fail if insufficient shares', async () => {
        const res = await request(app)
            .post('/api/sell')
            .send({
                assetId: testAsset._id,
                shares: 1000,
                walletAddress: testWallet
            });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.contain('Insufficient shares');
    });
});
