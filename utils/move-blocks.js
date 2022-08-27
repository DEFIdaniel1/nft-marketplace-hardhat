const { network } = require('hardhat')

//manual mine the node one more block
async function moveBlocks(amount, sleepAmount = 0) {
    console.log('Moving blocks...')
    for (let i = 0; i < amount; i++) {
        await network.provider.request({
            method: 'evm_mine',
            params: [],
        })
    }
    if (sleepAmount) {
        console.log(`Sleeping blockchain for ${sleepAmount}ms`)
        await sleep(sleepAmount)
    }
}

function sleep(timeInMs) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMs)
    })
}

module.exports = { moveBlocks, sleep }
