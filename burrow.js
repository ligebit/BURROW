const { Contract } = require("near-api-js");

const NUM_DECIMALS = 27n;
const MAX_RATIO = 10000n;

const DURAK_DEFENCE = 9500n;

class BURROW {

    constructor(near, account) {
        this.near = near;
        this.contractAddress = 'contract.main.burrow.near';
        this.account = account;
    }

    async load() {
        this.config = await this.near.call_contract(this.contractAddress, 'get_config', {});
    }

    async updateAssets() {
        const assets = await this.near.call_contract(this.contractAddress, 'get_assets_paged_detailed', {
            from_index: 0,
            limit: 100,
        });

        this.assets = Object.assign({}, ...assets.map(n => ({ [n.token_id]: n })))

        // console.log(assetsRequest);

        // const assets = assetsRequest.map((asset) => ({
        //     tokenId: asset[0],
        //     supplied: asset[1].supplied,
        //     borrowed: asset[1].borrowed,
        //     last_update_timestamp: asset[1].last_update_timestamp,
        //     config: asset[1].config
        // }));

        for (const id in this.assets) {
            const tokenMetadata = await this.near.call_contract(this.assets[id].token_id, 'ft_metadata', {});
            this.assets[id].tokenMetadata = tokenMetadata;
        }

    }

    static fromBalancePrice(balance, price, extraDecimals) {
        let num = BigInt(price.multiplier) * BigInt(balance);
        let denominatorDecimals = BigInt(price.decimals) + BigInt(extraDecimals);
        if (denominatorDecimals > NUM_DECIMALS) {
            return num / (10n ** (denominatorDecimals - NUM_DECIMALS))
        } else {
            return num * (10n ** (NUM_DECIMALS - denominatorDecimals))
        }
    }

    async updatePrices() {
        if(!this.assets) throw new Error('before using this method call updateAssets()');

        const arrayAssetsAddresses = Object.values(this.assets).map((asset) => asset.token_id);

        const prices = (await this.near.call_contract(this.config.oracle_account_id, 'get_price_data', {"asset_ids":arrayAssetsAddresses})).prices;

        const arrayOjectprices = prices.reduce((obj, item) => Object.assign(obj, { [item.asset_id]: item.price }), {});

        for (const id in this.assets) {
            this.assets[id].price = arrayOjectprices[this.assets[id].token_id];

            //calculate price
            //const price = BigInt(10)**BigInt(this.assets[id].tokenMetadata.decimals) * BigInt(this.assets[id].price.multiplier) / BigInt(10)**(BigInt(this.assets[id].price.decimals) - BigInt(this.assets[id].tokenMetadata.decimals))
        }
    }

    static getHumanPriceAsset(asset) {
        const priceBigInt = BigInt(10)**BigInt(asset.tokenMetadata.decimals) * BigInt(asset.price.multiplier) / BigInt(10)**(BigInt(asset.price.decimals) - BigInt(asset.tokenMetadata.decimals))
        return parseInt(priceBigInt)/(10**asset.tokenMetadata.decimals);
    }

    getAccount(accountId) {
        return this.near.call_contract(this.contractAddress, 'get_account', {account_id: accountId});
    }

    async getAccountColateralBorrow() {
        await this.updatePrices();
        const accountAssets = await this.getAccount('bozon.near');
    
        let collateralAll = 0n;
        let adjustedCollateral = 0n;
    
        let borrowAll = 0n;
        let adjustedBorrow = 0n;
    
        for (const asset of accountAssets.collateral) {
            const price = this.assets[asset.token_id].price;
            const volatilityRatio = BigInt(this.assets[asset.token_id].config.volatility_ratio);
            const extraDecimals = this.assets[asset.token_id].config.extra_decimals;
            const decimals = this.assets[asset.token_id].tokenMetadata.decimals;
    
            const collateral = BURROW.fromBalancePrice(asset.balance, price, extraDecimals);
            collateralAll += collateral;
    
            adjustedCollateral += (collateral * volatilityRatio) / MAX_RATIO;
    
            //adjusted_collateral_sum = sum(collateral_i * price_i * volatility_ratio_i)
        }
    
        for (const asset of accountAssets.borrowed) {
            const price = this.assets[asset.token_id].price;
            const volatilityRatio = BigInt(this.assets[asset.token_id].config.volatility_ratio);
            const extraDecimals = this.assets[asset.token_id].config.extra_decimals;
            const decimals = this.assets[asset.token_id].tokenMetadata.decimals;
    
            const borrow = BURROW.fromBalancePrice(asset.balance, price, extraDecimals);
    
            borrowAll += borrow;
            adjustedBorrow += (borrow / volatilityRatio) * MAX_RATIO;
            //adjusted_collateral_sum = sum(collateral_i * price_i * volatility_ratio_i)
        }

        return {
            account: accountAssets,
            adjustedCollateral: adjustedCollateral,
            adjustedBorrow: adjustedBorrow,
            collateralAll: collateralAll,
            borrowAll: borrowAll
        }
    }

    getMaxBorrowAmount(tokenId, accountDetail) {
        const volatiliyRatio = BigInt(this.assets[tokenId].config.volatility_ratio || 0);
        const tokenDecimals = BigInt(this.assets[tokenId].tokenMetadata.decimals);
        const extraDecimals = BigInt(this.assets[tokenId].config.extra_decimals);

        const aviableBorrowBalanceInUsd = (accountDetail.adjustedCollateral - accountDetail.adjustedBorrow) * volatiliyRatio;

        return (aviableBorrowBalanceInUsd / BigInt(this.assets[tokenId].price.multiplier)) * (10n** (tokenDecimals + extraDecimals)) / (10n ** NUM_DECIMALS)
    }

    getMaxWithdrawAmount(tokenId, accountDetail) {
        const volatiliyRatio = BigInt(this.assets[tokenId].config.volatility_ratio || 0);
        const tokenDecimals = BigInt(this.assets[tokenId].tokenMetadata.decimals);
        const extraDecimals = BigInt(this.assets[tokenId].config.extra_decimals);

        const aviableBorrowBalanceInUsd = (accountDetail.adjustedCollateral - accountDetail.adjustedBorrow) / volatiliyRatio;

        return aviableBorrowBalanceInUsd * BigInt(this.assets[tokenId].price.multiplier) * (10n** (tokenDecimals + extraDecimals)) / (10n ** NUM_DECIMALS)
    }

    execute(args) {
        const contart = new Contract(
            this.account,
            this.contractAddress, {
                viewMethods: [],
                changeMethods: ['execute']
            }
        );
        return contart.execute(args, "300000000000000", "1");
    }

    oracleCall(args) {
        const contart = new Contract(
            this.account,
            this.config.oracle_account_id, {
                viewMethods: [],
                changeMethods: ['oracle_call']
            }
        );
        return contart.oracle_call(args, "300000000000000", "1");
    }

    getBalanceToken(tokenId, accountId) {
        return this.near.call_contract(tokenId, 'ft_balance_of', {account_id: accountId});
    }
   
}


module.exports = {BURROW, NUM_DECIMALS}