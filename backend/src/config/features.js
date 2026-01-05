export const FEATURES = {
    FEE_COLLECTION: process.env.ENABLE_FEE_COLLECTION !== 'false',
    REWARD_DISTRIBUTION: process.env.ENABLE_REWARD_DISTRIBUTION !== 'false',
    BUYBACK_BURN: process.env.ENABLE_BUYBACK_BURN !== 'false',
    AUTO_CLAIM: process.env.ENABLE_AUTO_CLAIM !== 'false',
};

export function logFeatures() {
    console.log('\n⚙️  FEATURE SWITCHES:');
    console.log(`   Fee Collection: ${FEATURES.FEE_COLLECTION ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`   Reward Distribution: ${FEATURES.REWARD_DISTRIBUTION ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`   Buyback & Burn: ${FEATURES.BUYBACK_BURN ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`   Auto Claim Fees: ${FEATURES.AUTO_CLAIM ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log('');
}
