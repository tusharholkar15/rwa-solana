const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');

describe('KYC API Endpoints', () => {
    const testWallet = 'test-wallet-' + Date.now();

    before(async () => {
        // Ensure DB connection is ready
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-solana-test');
        }
    });

    after(async () => {
        await User.deleteMany({ walletAddress: testWallet });
    });

    it('POST /api/kyc/verify - should submit KYC data', async () => {
        const res = await request(app)
            .post('/api/kyc/verify')
            .send({
                walletAddress: testWallet,
                name: 'Test User',
                email: 'test@example.com',
                documentType: 'passport',
                documentId: 'A1234567'
            });

        expect(res.status).to.equal(200);
        expect(res.body.status).to.equal('pending');

        const user = await User.findOne({ walletAddress: testWallet });
        expect(user.kycStatus).to.equal('pending');
    });

    it('GET /api/kyc/status/:wallet - should return KYC status', async () => {
        const res = await request(app)
            .get(`/api/kyc/status/${testWallet}`);

        expect(res.status).to.equal(200);
        expect(res.body.status).to.equal('pending');
    });

    it('POST /api/kyc/approve - should approve KYC', async () => {
        const res = await request(app)
            .post('/api/kyc/approve')
            .send({ walletAddress: testWallet });

        expect(res.status).to.equal(200);
        expect(res.body.status).to.equal('approved');

        const user = await User.findOne({ walletAddress: testWallet });
        expect(user.kycStatus).to.equal('approved');
        expect(user.isWhitelisted).to.be.true;
    });

    it('GET /api/kyc/pending - should list pending applications', async () => {
        // Create another pending user
        const pendingWallet = 'pending-' + Date.now();
        await User.create({
            walletAddress: pendingWallet,
            kycStatus: 'pending',
            kycSubmittedAt: new Date()
        });

        const res = await request(app)
            .get('/api/kyc/pending');

        expect(res.status).to.equal(200);
        expect(res.body.applications).to.be.an('array');
        expect(res.body.applications.some(a => a.walletAddress === pendingWallet)).to.be.true;

        await User.deleteMany({ walletAddress: pendingWallet });
    });
});
