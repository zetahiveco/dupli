import { Pinecone } from "@pinecone-database/pinecone"
import { OpenAI } from "openai"
import { v4 as uuidv4 } from "uuid"


export async function storeData(data: string, organizationId: string, namespace: string, indexId: string = "") {

    // TODO: Store chunks in pinecone database
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || ""
    })

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || ""
    })

    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: data
    })

    const index = pinecone.Index(process.env.PINECONE_INDEX || "")

    const id = indexId || uuidv4()

    await index.namespace(`${namespace}_${organizationId}`).upsert([
        {
            id: id,
            values: embedding.data[0].embedding,
            metadata: {
                text: data
            }
        }
    ])

    return id

}

export async function retrieveDocuments(query: string, topK: number, namespace: string, organizationId: string) {
    // TODO: Retrieve chunks from pinecone database
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || ""
    })

    const index = pinecone.Index(process.env.PINECONE_INDEX || "")

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || ""
    })

    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query
    })

    const queryResponse = await index.namespace(`${namespace}_${organizationId}`).query({
        vector: embedding.data[0].embedding,
        topK: topK,
    })

    return queryResponse.matches
}


export async function retrieveData(query: string, topK: number, namespace: string, organizationId: string) {

    let queryResponse = await retrieveDocuments(query, topK, namespace, organizationId)

    let response = ""

    for (const result of queryResponse) {
        if (result.metadata && result.metadata.text) {
            response += `${result.metadata.text}\n`
        }
    }

    return response
}


export async function deleteMemoryById(id: string, namespace: string, organizationId: string) {
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || ""
    })

    const index = pinecone.Index(process.env.PINECONE_INDEX || "")

    await index.namespace(`${namespace}_${organizationId}`).deleteOne(id)

    return true
}
