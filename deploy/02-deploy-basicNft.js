const { network } = require('hardhat')
const { networkConfig } = require('../helper-hardhat-config')
const { verify } = require('../utils/verify')

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId
    const args = []

    log('-------------Deploying Basic NFT-----------')

    const nftMarketplace = await deploy('BasicNft', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: networkConfig[chainId].blockConfirmation,
    })
    log('---------------------------------------')

    if (chainId != 31337) {
        log('Verify initiated')
        verify(nftMarketplace.address, args)
    }
}
module.exports.tags = ['all', 'basic']
