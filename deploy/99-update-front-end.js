const { ethers, network } = require('hardhat')
const fs = require('fs')
const nftMarketplaceAddressFile = '../nft-marketplace-nextJS/constants/nftMarketplaceAddresses.json'
const basicNftAddressFile = '../nft-marketplace-nextJS/constants/basicNftAddresses.json'
const chainId = network.config.chainId.toString()

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log('-----------------------------------')
        console.log('Updating front-end...')
        await updateNftMarketplaceAddress()
        await updateBasicNftAddress()
    }
}
async function updateNftMarketplaceAddress() {
    const nftMarketplace = await ethers.getContract('NFTMarketplace')
    const contractAddresses = JSON.parse(fs.readFileSync(nftMarketplaceAddressFile, 'utf8'))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]['NFTMarketplace'].includes(nftMarketplace.address)) {
            contractAddresses[chainId]['NFTMarketplace'].push(nftMarketplace.address)
        }
    } else {
        contractAddresses[chainId] = { NFTMarketplace: [nftMarketplace.address] }
    }
    fs.writeFileSync(nftMarketplaceAddressFile, JSON.stringify(contractAddresses))
    console.log('Nft Marketplace Contract Address File Updated')
}
async function updateBasicNftAddress() {
    const basicNft = await ethers.getContract('BasicNft')
    const contractAddresses = JSON.parse(fs.readFileSync(basicNftAddressFile, 'utf8'))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]['BasicNft'].includes(basicNft.address)) {
            contractAddresses[chainId]['BasicNft'].push(basicNft.address)
        }
    } else {
        contractAddresses[chainId] = { BasicNft: [basicNft.address] }
    }
    fs.writeFileSync(basicNftAddressFile, JSON.stringify(contractAddresses))
    console.log('BasicNft Contract Address updated.')
}

module.exports.tags = ['all', 'frontend']
