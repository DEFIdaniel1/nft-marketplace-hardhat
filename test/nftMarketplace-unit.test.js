const { assert } = require('chai')
const { network, ethers, deployments } = require('hardhat')
const chainId = network.config.chainId

chainId != 31337
    ? describe.skip
    : describe('NFT Marketplace', function () {
          let account1, deployer, nftMarketplace, nftMarketplaceContract
          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              account1 = accounts[1]
          })
          describe('Deployment', async function () {
              it('Deploys successfully to address', async function () {
                  await deployments.fixture('marketplace')
                  nftMarketplaceContract = await ethers.getContract('NFTMarketplace')
                  nftMarketplace = nftMarketplaceContract.connect(deployer)
                  assert(nftMarketplace.address)
              })
          })
          beforeEach(async function () {
              await deployments.fixture('marketplace')
              nftMarketplaceContract = await ethers.getContract('NFTMarketplace')
              nftMarketplace = nftMarketplaceContract.connect(deployer)
          })
          describe('listNFT function', async function () {
              it('emits NFTListed event on success', async function () {
                  console.log(account1.address)
              })
          })
      })
