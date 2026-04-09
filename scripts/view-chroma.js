const { ChromaClient } = require('chromadb');
require('dotenv').config();

async function viewChroma() {
    const host = process.env.CHROMA_HOST || 'http://localhost:8000';
    const client = new ChromaClient({ path: host });

    try {
        console.log(`\n--- ChromaDB Viewer ---`);
        console.log(`Connecting to: ${host}`);
        
        // 1. Check Heartbeat
        const hb = await client.heartbeat();
        console.log(`Heartbeat: ${hb}`);

        // 2. List Collections
        const collections = await client.listCollections();
        console.log(`Collections found: ${collections.length}\n`);

        for (const col of collections) {
            console.log(`Collection: ${col.name}`);
            const collection = await client.getCollection({ name: col.name });
            const count = await collection.count();
            console.log(`- Item count: ${count}`);
            
            if (count > 0) {
                // Peek at some items
                const peek = await collection.peek({ limit: 1 });
                console.log(`- Sample Metadata:`, peek.metadatas[0]);
                console.log(`- Sample Document Snippet: ${peek.documents[0]?.substring(0, 100)}...`);
            }
            console.log('---');
        }

    } catch (error) {
        console.error(`\nError connecting to ChromaDB: ${error.message}`);
        if (error.message.includes('ECONNREFUSED')) {
            console.log(`\nTip: Make sure your ChromaDB server is running at ${host}`);
            console.log(`If you use Docker, run: docker run -p 8000:8000 chromadb/chroma`);
        }
    }
}

viewChroma();
