"use server";

export async function uploadToCloud(base64Image: string) {
    try {
        const apiKey = process.env.IMGBB_API_KEY;

        if (!apiKey) {
            console.error("SERVER ERROR: Missing IMGBB_API_KEY in environment variables.");
            return null; // Return null gracefully instead of crashing
        }

        // Strip the data URL prefix
        const base64Data = base64Image.split(",")[1];

        const formData = new FormData();
        formData.append("image", base64Data);

        // Send to ImgBB
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (data && data.data && data.data.url) {
            return data.data.url;
        } else {
            console.error("ImgBB API Error:", data);
            return null;
        }
    } catch (err) {
        console.error("Server Upload Exception:", err);
        return null;
    }
}