const {BURROW, NUM_DECIMALS} = require("./burrow");
const NEAR = require("./near");

const {PRIVATE_KEY, ACCOUNT_ID, multiplicatorTokenId, multiplicator} = require('./config.js')();

async function main() {
    const near = new NEAR('mainnet');
    await near.load();

    const account = await near.addAccount(PRIVATE_KEY, ACCOUNT_ID);

    const burrow = new BURROW(near, account);

    await burrow.load();
    await burrow.updateAssets();
    await burrow.updatePrices();

    
    const accountDetail = await burrow.getAccountColateralBorrow('bozon.near');

    const maxBorrow = burrow.getMaxBorrowAmount(multiplicatorTokenId, accountDetail)

    console.log(await burrow.oracleCall({
        "receiver_id": burrow.contractAddress,
        "msg": JSON.stringify({
            Execute: {
                actions: [
                    {
                        Borrow: {
                            "token_id": multiplicatorTokenId,
                            "amount": (maxBorrow * multiplicator).toString()
                        }
                    },
                    {
                        IncreaseCollateral: {
                            "token_id": multiplicatorTokenId
                        }
                    }
                ]
            }
        })
    }));



}

main();