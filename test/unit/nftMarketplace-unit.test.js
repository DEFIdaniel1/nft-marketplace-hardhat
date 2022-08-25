const { assert, expect } = require('chai')
const { network, ethers, deployments } = require('hardhat')
const chainId = network.config.chainId

chainId != 31337
    ? describe.skip
    : describe('NFT Marketplace', function () {
          let account1, deployer, nftMarketplace, nftMarketplaceContract, basicNftContract, basicNft
          const price0 = ethers.utils.parseEther('0.1')
          const insufficientPrice = ethers.utils.parseEther('0.09')
          const tokenId0 = 0
          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              account1 = accounts[1]
          })
          describe('Deployment', async function () {
              it('NFTMarketplace deploys successfully to address', async function () {
                  await deployments.fixture('marketplace')
                  nftMarketplaceContract = await ethers.getContract('NFTMarketplace')
                  nftMarketplace = nftMarketplaceContract.connect(deployer)
                  assert(nftMarketplace.address)
              })
              it('BasicNft deploys successfully to address', async function () {
                  await deployments.fixture('basic')
                  basicNftContract = await ethers.getContract('BasicNft')
                  basicNft = basicNftContract.connect(deployer)
                  assert(basicNft.address)
              })
          })
          beforeEach(async function () {
              await deployments.fixture('all')
              nftMarketplaceContract = await ethers.getContract('NFTMarketplace')
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              basicNftContract = await ethers.getContract('BasicNft')
              basicNft = basicNftContract.connect(deployer) //explicitly states this is called by deployer
              const mintTx = await basicNft.mintNft() //called by deployer
              await mintTx.wait(1)
              //gives nftMarketplace approval to interact with NFT
              await basicNft.approve(nftMarketplaceContract.address, tokenId0) //deployer calls/gives access
          })
          describe('listNFT function', async function () {
              it('emits NFTListed event on success', async function () {
                  expect(await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)).to.emit(
                      'NFTListed'
                  )
              })
              it('maps Listing correctly', async function () {
                  await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  const listing = await nftMarketplace.getListing(basicNft.address, tokenId0)
                  const listingPrice = listing.price
                  assert.equal(listingPrice.toString(), price0)
                  const listingSeller = listing.seller
                  assert.equal(listingSeller.toString(), deployer.address)
              })
              it('reverts if token is already listed', async function () {
                  const listNft = await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  listNft.wait(1)
                  await expect(
                      nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  ).to.be.revertedWithCustomError(nftMarketplace, `NFTMarketplace__AlreadyListed`)
              })
              it('reverts if price is 0 or less', async function () {
                  // uint256 for price, so cannot be negative integer
                  await expect(
                      nftMarketplace.listNFT(basicNft.address, tokenId0, 0)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      `NFTMarketplace__PriceMustBeMoreThan0`
                  )
              })
              it('reverts if not approved by seller', async function () {
                  const mintNft2 = await basicNft.mintNft()
                  const tokenId2 = 1
                  await expect(
                      nftMarketplace.listNFT(basicNft.address, tokenId2, price0)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      `NFTMarketplace__NotApprovedToListNFT`
                  )
              })
              it('reverts if not NFT owner', async function () {
                  nftMarketplace = await nftMarketplaceContract.connect(account1)
                  await expect(
                      nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  ).to.be.revertedWithCustomError(nftMarketplace, `NFTMarketplace__NotNFTOwner`)
              })
          })
          describe('buyNFT function', async function () {
              it('reverts if NFT is not listed', async function () {
                  nftMarketplace = await nftMarketplaceContract.connect(account1)
                  expect(
                      await nftMarketplace.buyNFT(basicNft.address, tokenId0, { value: price0 })
                  ).to.revertedWithCustomError(nftMarketplace, 'NFTMarketplace__NotListedForSale')
              })
              beforeEach(async function () {
                  await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  nftMarketplace = await nftMarketplaceContract.connect(account1)
              })
              it('emits NFTPurchased event on success', async function () {
                  expect(
                      await nftMarketplace.buyNFT(basicNft.address, tokenId0, { value: price0 })
                  ).to.emit('NFTPurchased')
              })
              it('reverts if price is not met', async function () {
                  await expect(
                      nftMarketplace.buyNFT(basicNft.address, tokenId0, {
                          value: insufficientPrice,
                      })
                  ).to.revertedWithCustomError(nftMarketplace, 'NFTMarketplace__PriceNotMet')
              })
              it('listing is deleted after purchase', async function () {
                  await nftMarketplace.buyNFT(basicNft.address, tokenId0, {
                      value: price0,
                  })
                  const listingCheck = await nftMarketplace.getListing(basicNft.address, tokenId0)
                  assert.equal(listingCheck.seller.toString(), 0)
              })
              it('transfers NFT to new owner and updates proceeds record', async function () {
                  await nftMarketplace.buyNFT(basicNft.address, tokenId0, {
                      value: price0,
                  })
                  const newOwner = await basicNft.ownerOf(tokenId0)
                  assert.equal(newOwner.toString(), account1.address)
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                  assert.equal(deployerProceeds.toString(), price0.toString())
              })
          })
          describe('updateListing function', function () {
              it('must be owner and listed', async function () {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, tokenId0, price0)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      'NFTMarketplace__NotListedForSale'
                  )
                  await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  nftMarketplace = nftMarketplaceContract.connect(account1)
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, tokenId0, price0)
                  ).to.be.revertedWithCustomError(nftMarketplace, 'NFTMarketplace__NotNFTOwner')
              })
              it('updates the price of the NFT', async function () {
                  const updatedPrice = ethers.utils.parseEther('0.2')
                  await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  expect(
                      await nftMarketplace.updateListing(basicNft.address, tokenId0, updatedPrice)
                  ).to.emit('ItemListed')
                  const listing = await nftMarketplace.getListing(basicNft.address, tokenId0)
                  assert.equal(listing.price.toString(), updatedPrice.toString())
              })
          })
          describe('cancelListing', function () {
              it('reverts if there is no listing', async function () {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, tokenId0)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      'NFTMarketplace__NotListedForSale'
                  )
              })
              it('reverts if anyone but the owner tries to call', async function () {
                  await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  nftMarketplace = nftMarketplaceContract.connect(account1)
                  await basicNft.approve(account1.address, tokenId0)
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, tokenId0)
                  ).to.revertedWithCustomError(nftMarketplace, 'NFTMarketplace__NotNFTOwner')
              })
              it('emits event and removes listing', async function () {
                  await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  expect(await nftMarketplace.cancelListing(basicNft.address, tokenId0)).to.emit(
                      'ItemCanceled'
                  )
                  const listing = await nftMarketplace.getListing(basicNft.address, tokenId0)
                  assert(listing.price.toString() == '0')
              })
          })
          describe('withdrawProceeds function', function () {
              it("doesn't allow 0 proceed withdrawals", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.revertedWithCustomError(
                      nftMarketplace,
                      'NFTMarketplace__NoProceedsToWithdraw'
                  )
              })
              it('withdraws proceeds', async function () {
                  await nftMarketplace.listNFT(basicNft.address, tokenId0, price0)
                  nftMarketplace = nftMarketplaceContract.connect(account1)
                  await nftMarketplace.buyNFT(basicNft.address, tokenId0, { value: price0 })
                  nftMarketplace = nftMarketplaceContract.connect(deployer)

                  const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const withdrawTx = await nftMarketplace.withdrawProceeds()
                  const withdrawTxReceipt = await withdrawTx.wait(1)
                  const { gasUsed, effectiveGasPrice } = withdrawTxReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
