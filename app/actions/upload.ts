"use server";

export async function uploadToCloud(base64Image: string) {
    // 1. Pull the key securely from the server environment
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
        throw new Error("Server configuration error: Missing API Key.");
    }

    // 2. Strip the data URL prefix (data:image/webp;base64,...)
    const base64Data = base64Image.split(",")[1];

    // 3. Prepare the payload
    const formData = new FormData();
    formData.append("image", base64Data);

    try {
        // 4. Send from SERVER to ImgBB (Client never sees the key)
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (data && data.data && data.data.url) {
            return data.data.url;
        } else {
            throw new Error("Failed to retrieve URL from ImgBB.");
        }
    } catch (err) {
        console.error("Server Upload Failed:", err);
        return null;
    }
}