module.exports = function config() {
    //Данные от аккаунта

    //Ключ вида '3Vb1zTRpg7R4eSTP6feRhjKmnPc7MyVnAd5B9PASin259uFhL6jKHtshnHhMtvMyLytcrLpDEZBhsJcQSR39C24P'
    const PRIVATE_KEY = '3Vb1zTRpg7R4eSTP6feRhjKmnPc7MyVnAd5B9PASin259uFhL6jKHtshnHhMtvMyLytcrLpDEZBhsJcQSR39C24P';
    //аккаунт вида account.near
    const ACCOUNT_ID = 'account.near';

    //Адрес токена для мультипликации
    const multiplicatorTokenId = 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near';
    //const multiplicatorTokenId = 'dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near';

    //Во сколько раз увеличить свободный депозит (BigInt)
    const multiplicator = 10n;

    return {
        PRIVATE_KEY: PRIVATE_KEY,
        ACCOUNT_ID: ACCOUNT_ID,
        multiplicatorTokenId: multiplicatorTokenId,
        multiplicator: multiplicator
    }
}