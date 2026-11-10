const SUPABASE_URL = "https://izdosqdrgghnjadihujs.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZbUfnH5BeJOO7yRcKgR_fA_2wJxMIjw";

const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

function showForm() {
    document.getElementById("confessionForm").style.display = "block";

    document.getElementById("confessionForm").scrollIntoView({
        behavior: "smooth"
    });
}

async function submitConfession() {
    const confession = document.getElementById("confession").value.trim();
    const nickname = document.getElementById("nickname").value.trim();
    const photo = document.getElementById("photo").files[0];
    const message = document.getElementById("message");

    if (!confession) {
        message.innerText = "Please write your confession ❤️";
        return;
    }

    if (photo && photo.size > 5 * 1024 * 1024) {
        message.innerText = "Picture must be smaller than 5 MB.";
        return;
    }

    if (photo && !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
        message.innerText = "Please select a JPG, PNG or WEBP picture.";
        return;
    }

    message.innerText = "Sending your confession...";

    try {
        let imagePath = null;

        if (photo) {
            const fileName = crypto.randomUUID() + "-" + photo.name;

            const { data, error } = await client.storage
                .from("Confession-photos")
                .upload(fileName, photo);

            if (error) throw error;

            imagePath = data.path;
        }

        const { error } = await client
            .from("confessions")
            .insert([{
                message: confession,
                nickname: nickname || "Anonymous",
                image_path: imagePath
            }]);

        if (error) throw error;

        message.innerText = "Your confession was received! ❤️";

        document.getElementById("confession").value = "";
        document.getElementById("nickname").value = "";
        document.getElementById("photo").value = "";

    } catch (error) {
        console.error(error);
        message.innerText = "Something went wrong. Please try again.";
    }
}