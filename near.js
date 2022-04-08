const { connect, KeyPair, keyStores, utils, transactions } = require("near-api-js");

module.exports = class NEAR {

    constructor(networkId) {

        this.keyStore = new keyStores.InMemoryKeyStore();

        this.config = {
            networkId,
            keyStore: this.keyStore,
            nodeUrl: `https://rpc.${networkId}.near.org`,
            walletUrl: `https://wallet.${networkId}.near.org`,
            helperUrl: `https://helper.${networkId}.near.org`,
            explorerUrl: `https://explorer.${networkId}.near.org`
        };
    }

    async load() {
        this.nearConnect = await connect(this.config);
    }

    request_near_rpc(params, method) {
        return new Promise(async (resolve, reject) => {

            const json_args = {jsonrpc: "2.0", id: "dontcare", method: method, params: params}

            const fetch_args = {
                method: "POST",
                body: JSON.stringify(json_args),
                headers: {
                    "Content-Type": "application/json"
                }
            }
    
            try {
                const response = await fetch(this.config.nodeUrl, fetch_args);
                const {result} = await response.json();
                if(result.result) {
                    const decode_result = JSON.parse((new TextDecoder()).decode(new Uint8Array(result.result)));
                    resolve(decode_result);
                }
                resolve(result);
            
            } catch(err) {
                setTimeout(async () => {
                    console.log(`Error. Repeat`);
                    return await this.request_near_rpc(params, method);
                }, 5000)
            }
        }); 
    }

    call_contract(account_id, method_name, args) {
        return new Promise(async (resolve, reject) => {

            const args_base64 = Buffer.from(JSON.stringify(args)).toString('base64')

            const params = {
                account_id: account_id, 
                method_name: method_name, 
                request_type: 'call_function', 
                finality: 'final', 
                'args_base64': args_base64
            }

            const resuslt = await this.request_near_rpc(params, 'query');

            resolve(resuslt);
        }); 
    }

    view_account(accountId) {
        return new Promise(async (resolve, reject) => {

            const params = {
                account_id: accountId, 
                request_type: 'view_account', 
                finality: 'optimistic'
            }

            const result = await this.request_near_rpc(params, 'query');
    
            resolve(result);
        }); 
    }

    get_block(blockNumber) {
        return new Promise(async (resolve, reject) => {

            let params;
            if(blockNumber) {
                params = {
                    block_id: blockNumber
                }
            } else {
                params = {
                    finality: 'final'
                }
            }

            const result = await this.request_near_rpc(params, 'block');
    
            resolve(result);
        }); 
    }

    get_chunk(chunkHash) {
        return new Promise(async (resolve, reject) => {

            const params = {
                chunk_id: chunkHash
            }

            const result = await this.request_near_rpc(params, 'chunk');
    
            resolve(result);
        }); 
    }

    protocol_config() {
        return new Promise(async (resolve, reject) => {

            const params = {
                finality: 'final'
            }

            const result = await this.request_near_rpc(params, 'EXPERIMENTAL_protocol_config');

            resolve(result);
        }); 
    }

    async addAccount(PRIVATE_KEY, ACCOUNT_ID) {
        const keyPair = KeyPair.fromString(PRIVATE_KEY);
        await this.keyStore.setKey(this.config.networkId, ACCOUNT_ID, keyPair);
        return await this.nearConnect.account(ACCOUNT_ID);
    }

}