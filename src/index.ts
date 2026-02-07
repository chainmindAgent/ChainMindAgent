import config, { validateConfig, agentConfig, llmConfig } from './config.js';
import { Brain } from './brain/index.js';
import { MoltbookClient } from './platforms/moltbook.js';
import { startScheduler } from './brain/scheduler.js';

/**
 * ChainMind Agent - Main Entry Point
 * 
 * BNB Chain Knowledge AI Agent with:
 * - Self-training knowledge brain
 * - Moltbook & Twitter integration
 * - Web chat interface
 * - BAP-578 NFA compatibility
 */

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗            ║
║  ██╔════╝██║  ██║██╔══██╗██║████╗  ██║            ║
║  ██║     ███████║███████║██║██╔██╗ ██║            ║
║  ██║     ██╔══██║██╔══██║██║██║╚██╗██║            ║
║  ╚██████╗██║  ██║██║  ██║██║██║ ╚████║            ║
║   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝            ║
║                                                   ║
║  ███╗   ███╗██╗███╗   ██╗██████╗                  ║
║  ████╗ ████║██║████╗  ██║██╔══██╗                 ║
║  ██╔████╔██║██║██╔██╗ ██║██║  ██║                 ║
║  ██║╚██╔╝██║██║██║╚██╗██║██║  ██║                 ║
║  ██║ ╚═╝ ██║██║██║ ╚████║██████╔╝                 ║
║  ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝                  ║
║                                                   ║
║        BNB Chain Knowledge AI Agent               ║
║              by OpenClaw                          ║
╚═══════════════════════════════════════════════════╝
`);

async function main() {
    console.log(`🚀 Starting ${agentConfig.name} v${agentConfig.version}...`);

    // Validate configuration
    const validation = validateConfig();
    if (!validation.valid) {
        console.error('❌ Configuration errors:');
        validation.errors.forEach(err => console.error(`   - ${err}`));
        console.log('\n📝 Copy .env.example to .env and fill in required values.');
        process.exit(1);
    }

    console.log('✅ Configuration validated');
    console.log(`🧠 LLM: Z.AI (${llmConfig.model})`);
    console.log(`🦞 Moltbook: ${config.moltbook.agentName}`);
    console.log(`📡 Autonomy: ${config.autonomy.mode} mode`);

    try {
        // Initialize Brain
        console.log('\n🧠 Initializing Knowledge Brain...');
        const brain = new Brain();
        await brain.initialize();

        // Initialize Moltbook Client
        console.log('🦞 Connecting to Moltbook...');
        const moltbook = new MoltbookClient();
        const status = await moltbook.checkStatus();

        if (status.claimed) {
            console.log(`✅ Moltbook: Claimed and active`);
        } else {
            console.log('⚠️  Moltbook: Not yet claimed');
            console.log(`   Claim URL: ${status.claimUrl}`);
        }

        // Start scheduler for autonomous operations
        console.log('\n⏰ Starting autonomous scheduler...');
        startScheduler(brain, moltbook);

        console.log('\n✨ ChainMind is ready!');
        console.log('─'.repeat(50));
        console.log('Commands:');
        console.log('  npm run train       - Update knowledge brain');
        console.log('  npm run web         - Start web chat interface');
        console.log('  npm run post:moltbook - Post to Moltbook');
        console.log('─'.repeat(50));

        // Keep the process alive
        process.on('SIGINT', () => {
            console.log('\n👋 ChainMind shutting down...');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start ChainMind:', error);
        process.exit(1);
    }
}

main();
