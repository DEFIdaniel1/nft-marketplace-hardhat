const { ethers, network } = require('hardhat')
const { moveBlocks } = require('../utils/move-blocks')

async function mintAndList() {
    const nftMarketplace = await ethers.getContract('NFTMarketplace')
    const basicNft = await ethers.getContract('BasicNft')

    console.log('Minting Basic NFT....')
    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events[0].args.tokenId
    const price = ethers.utils.parseEther('0.02')
    const basicNftAddress = basicNft.address

    console.log('Approving NFT...')
    const approvalTx = await basicNft.approve(nftMarketplace.address, tokenId)
    await approvalTx.wait(1)

    console.log('Listing NFT on marketplace...')
    const listingTx = await nftMarketplace.listNFT(basicNftAddress, tokenId, price)
    await listingTx.wait(1)
    console.log('NFT has been listed!--------------------------')

    if (network.config.chainId == 31337) {
        await moveBlocks(2, 1000)
    }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
