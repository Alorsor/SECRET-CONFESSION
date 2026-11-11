// SUPABASE CONNECTION
const SUPABASE_URL = "https://izdosqdrgghnjadihujs.supabase.co";

// Keep your existing publishable key here
const SUPABASE_KEY = "sb_publishable_ZbUfnH5BeJOO7yRcKgR_fA_2wJxMIjw";

const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const $ = id => document.getElementById(id);

function showStatus(id, message) {
    $(id).textContent = message;
}


// CREATE USERNAME AND PRIVATE ACCOUNT
async function createAccount() {
    const username = $("username").value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        showStatus("authStatus",
            "Use 3–20 letters, numbers or underscores.");
        return;
    }

    showStatus("authStatus", "Creating your personal link...");

    try {
        let { data: { user } } = await client.auth.getUser();

        // Automatically create a private account if needed
        if (!user) {
            const { data, error } = await client.auth.signInAnonymously();

            if (error) throw error;

            user = data.user;
        }

        // Check whether this account already has a username
        const { data: existing, error: lookupError } = await client
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
            showAccount(existing.username);
            return;
        }

        // Save the chosen username
        const { error } = await client
            .from("profiles")
            .insert({
                id: user.id,
                username: username
            });

        if (error) {
            if (error.code === "23505") {
                throw new Error("That username is already taken. Choose another.");
            }
            throw error;
        }

        showAccount(username);

    } catch (error) {
        console.error(error);
        showStatus("authStatus", error.message);
    }
}

// CREATE AN ACCOUNT FROM SOMEONE ELSE'S PERSONAL LINK
async function createVisitorAccount() {
    const username = $("visitorUsername").value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        showStatus("visitorAccountStatus",
            "Use 3–20 letters, numbers or underscores.");
        return;
    }

    showStatus("visitorAccountStatus", "Creating your personal link...");

    try {
        let { data: { user }, error: userError } =
            await client.auth.getUser();

        if (userError) throw userError;

        if (!user) {
            const { data, error } =
                await client.auth.signInAnonymously();

            if (error) throw error;

            user = data.user;
        }

        const { data: existing, error: lookupError } = await client
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
            showStatus("visitorAccountStatus",
                "You already have a personal link: " +
                location.origin + location.pathname +
                "?u=" + encodeURIComponent(existing.username));
            return;
        }

        const { error } = await client
            .from("profiles")
            .insert({
                id: user.id,
                username: username
            });

        if (error) {
            if (error.code === "23505") {
                throw new Error("That username is taken. Try another.");
            }
            throw error;
        }

        const personalLink = location.origin + location.pathname +
            "?u=" + encodeURIComponent(username);

        $("visitorAccountStatus").textContent =
            "Your personal link is ready! 💗 " + personalLink;

        $("visitorUsername").value = "";

    } catch (error) {
        console.error(error);
        showStatus("visitorAccountStatus", error.message);
    }
}   
// SHOW PERSONAL ACCOUNT
function showAccount(username) {
    $("authForms").classList.add("hidden");
    $("accountPanel").classList.remove("hidden");
    $("inboxPanel").classList.remove("hidden");
    $("createPostPanel").classList.remove("hidden");

    $("welcomeUser").textContent = "Welcome, " + username + "! ❤️";

    $("personalLink").value =
        location.origin + location.pathname + "?u=" +
        encodeURIComponent(username);

    loadInbox();
}


// RESTORE ACCOUNT WHEN WEBSITE OPENS
async function restoreAccount() {
    const { data: { session } } = await client.auth.getSession();

    if (!session) return;

    const { data: { user } } = await client.auth.getUser();

    if (!user) return;

    const { data, error } = await client
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    if (data) {
        showAccount(data.username);
    }
}


// SEND ANONYMOUS MESSAGE
const usernameFromUrl =
    new URLSearchParams(location.search).get("u");

async function sendAnonymousMessage() {
    const content = $("anonymousMessage").value.trim();

    if (!content) {
        showStatus("anonymousStatus", "Please write a message.");
        return;
    }

    showStatus("anonymousStatus", "Sending...");

    const { error } = await client.rpc(
        "submit_anonymous_message",
        {
            p_username: usernameFromUrl,
            p_content: content,
           
        }
    );

    if (error) {
        showStatus("anonymousStatus", error.message);
        return;
    }

    $("anonymousMessage").value = "";

    showStatus("anonymousStatus",
        "Your anonymous message has been sent! 💗");
}


// LOAD PRIVATE INBOX
async function loadInbox() {
    const box = $("inboxList");

    box.textContent = "Loading messages...";

    const { data, error } = await client
        .from("messages")
        .select("id, content, created_at")
        .order("created_at", { ascending: false });

    box.replaceChildren();

    if (error) {
        box.textContent = error.message;
        return;
    }

    if (!data.length) {
        box.textContent = "No messages yet. Share your link!";
        return;
    }

    data.forEach(item => {
        const card = document.createElement("article");
        card.className = "post-card";

        const message = document.createElement("p");
        message.textContent = item.content;

        const date = document.createElement("small");
        date.textContent =
            new Date(item.created_at).toLocaleString();

        const shareButton = document.createElement("button");
shareButton.textContent = "🎨 Create & Share Message Card";

shareButton.onclick = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;

    const ctx = canvas.getContext("2d");

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, "#250b35");
    gradient.addColorStop(1, "#6b1d68");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1350);

    // Card
    ctx.fillStyle = "#481b50";
    ctx.beginPath();
    ctx.roundRect(90, 220, 900, 850, 45);
    ctx.fill();

    // Heading
    ctx.fillStyle = "#d8a5ff";
    ctx.textAlign = "center";
    ctx.font = "bold 58px Arial";
    ctx.fillText("💌 SECRET CONFESSIONS", 540, 350);
// Golden message panel
ctx.save();
ctx.shadowColor = "#ffcc33";
ctx.shadowBlur = 35;
ctx.fillStyle = "#ffe36e";

ctx.beginPath();
ctx.roundRect(100, 450, 880, 500, 35);
ctx.fill();

ctx.restore();
   // NEON GLOW MESSAGE TEXT
ctx.save();

ctx.font = "bold 58px Arial";
ctx.textAlign = "center";
ctx.shadowColor = "#001aff";
ctx.shadowBlur = 30;
ctx.lineWidth = 2;
ctx.strokeStyle = "#ffffff";

const textGradient = ctx.createLinearGradient(200, 0, 880, 0);
textGradient.addColorStop(0, "#ff00cc");
textGradient.addColorStop(0.5, "#c084fc");
textGradient.addColorStop(1, "#00e5ff");

ctx.fillStyle = textGradient;

const words = item.content.split(" ");
let line = "";
let y = 570;

for (const word of words) {
    const testLine = line + word + " ";

    if (ctx.measureText(testLine).width > 740) {
        ctx.strokeText(line, 540, y);
        ctx.fillText(line, 540, y);
        line = word + " ";
        y += 70;
    } else {
        line = testLine;
    }
}

ctx.strokeText(line, 540, y);
ctx.fillText(line, 540, y);

ctx.restore();

    // Footer
    ctx.fillStyle = "#ffb5dc";
    ctx.font = "32px Arial";
   ctx.fillText("Someone sent you an anonymous message ❤️", 540, 980);
ctx.fillText("Secret Confessions", 540, 1120);

ctx.font = "bold 34px Arial";
ctx.fillStyle = "#ffe36e";
ctx.fillText("Create your own anonymous messages!", 540, 1200);

ctx.font = "26px Arial";
ctx.fillStyle = "#ffffff";
ctx.fillText("secret-confession-1.onrender.com", 540, 1260);

    const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/png")
    );

    const imageFile = new File(
        [blob],
        "secret-confession.png",
        { type: "image/png" }
    );

    if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
    files: [imageFile],
    title: "Anonymous Message",
    text: "Create your own anonymous messages: https://secret-confession-1.onrender.com"
});
    } else {
        const link = document.createElement("a");
        link.download = "secret-confession.png";
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        alert("Your message card has been downloaded. You can upload it to WhatsApp Status.");
    }
};
        card.append(message, date, shareButton);
        box.appendChild(card);
    });
}

// PUBLISH A PICTURE
async function loadInbox() {
    const box = $("inboxList");
    box.textContent = "Loading messages...";

    const { data, error } = await client
        .from("messages")
        .select("id, content, created_at, post_id")
        .order("created_at", { ascending: false });

    box.replaceChildren();

    if (error) {
        box.textContent = error.message;
        return;
    }

    if (!data.length) {
        box.textContent = "No messages yet. Share your link!";
        return;
    }

    for (const item of data) {
        const card = document.createElement("article");
        card.className = "post-card";

        // Show the original picture if this message is linked to one.
        if (item.post_id) {
            const { data: post, error: postError } = await client
                .from("posts")
                .select("image_url, caption")
                .eq("id", item.post_id)
                .maybeSingle();

            if (!postError && post) {
                const picture = document.createElement("img");
                picture.src = post.image_url;
                picture.alt = "Picture this message is about";
                card.appendChild(picture);

                if (post.caption) {
                    const caption = document.createElement("p");
                    caption.textContent = post.caption;
                    card.appendChild(caption);
                }
            }
        }

        const message = document.createElement("p");
        message.textContent = "💌 " + item.content;

        const date = document.createElement("small");
        date.textContent =
            new Date(item.created_at).toLocaleString();

        const shareButton = document.createElement("button");
        shareButton.textContent = "📲 Share on WhatsApp Status";

        shareButton.onclick = async () => {
            const shareText =
                "Someone sent me an anonymous message 💌\n\n" +
                '"' + item.content + '"' +
                "\n\nShared from Secret Confessions ❤️";

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "Anonymous Message",
                        text: shareText
                    });
                } catch (error) {
                    if (error.name !== "AbortError") {
                        alert("Sharing was unsuccessful. Please try again.");
                    }
                }
            } else {
                await navigator.clipboard.writeText(shareText);
                alert("Message copied! Paste it into your WhatsApp Status.");
            }
        };

        card.append(message, date, shareButton);
        box.appendChild(card);
    }
} 

// LOAD COMMUNITY POSTS
// LOAD POSTS FOR THE CURRENT PERSONAL LINK
async function loadPosts() {
    const box = $("postsList");
    box.textContent = "Loading pictures...";

    let query = client
        .from("posts")
        .select("id, author_id, caption, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

    // Show only the owner's pictures on a personal link.
    if (usernameFromUrl) {
        const { data: owner, error: ownerError } = await client
            .from("profiles")
            .select("id")
            .eq("username", usernameFromUrl.toLowerCase())
            .maybeSingle();

        if (ownerError || !owner) {
            box.textContent = "This personal link could not be found.";
            return;
        }

        query = query.eq("author_id", owner.id);
    }

    const { data, error } = await query;

    box.replaceChildren();

    if (error) {
        box.textContent = error.message;
        return;
    }

    if (!data.length) {
        box.textContent = "No pictures have been published yet.";
        return;
    }

    for (const post of data) {
        const card = document.createElement("article");
        card.className = "post-card";

        const image = document.createElement("img");
        image.src = post.image_url;
        image.alt = "Published picture";

        const caption = document.createElement("p");
        caption.textContent = post.caption || "";

        card.append(image, caption);

        // Private anonymous message about this picture.
        if (usernameFromUrl) {
            const privateInput = document.createElement("textarea");
            privateInput.maxLength = 2000;
            privateInput.placeholder =
                "Send a private anonymous message about this picture...";

            const privateButton = document.createElement("button");
            privateButton.textContent =
                "🔒 Send Private Anonymous Message";

            const privateFeedback = document.createElement("p");
            privateFeedback.className = "status";

            privateButton.onclick = async () => {
                const content = privateInput.value.trim();

                if (!content) {
                    privateFeedback.textContent = "Write a message first.";
                    return;
                }

                privateFeedback.textContent = "Sending privately...";
                privateButton.disabled = true;

                const { error } = await client.rpc(
                    "submit_anonymous_message",
                    {
                        p_username: usernameFromUrl,
                        p_content: content,
                        p_post_id: post.id
                    }
                );

                privateButton.disabled = false;

                if (error) {
                    privateFeedback.textContent = error.message;
                    return;
                }

                privateInput.value = "";
                privateFeedback.textContent =
                    "Your private anonymous message has been sent! ❤️";
            };

            card.append(
                privateInput,
                privateButton,
                privateFeedback
            );
        }

        // Show delete button only to the picture owner.
        const { data: { user } } = await client.auth.getUser();

        if (user && user.id === post.author_id) {
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "🗑️ Delete Picture";
            deleteButton.className = "secondary";

            deleteButton.onclick = async () => {
                if (!confirm("Are you sure you want to delete this picture?")) {
                    return;
                }

                deleteButton.textContent = "Deleting...";
                deleteButton.disabled = true;

                const { error } = await client
                    .from("posts")
                    .delete()
                    .eq("id", post.id);

                if (error) {
                    alert("Could not delete picture: " + error.message);
                    deleteButton.disabled = false;
                    deleteButton.textContent = "🗑️ Delete Picture";
                    return;
                }

                alert("Picture deleted successfully!");
                loadPosts();
            };

            card.appendChild(deleteButton);
        }

        // Existing public comments.
        const comments = document.createElement("div");
        comments.className = "comments";

        const result = await client
            .from("post_comments")
            .select("comment")
            .eq("post_id", post.id)
            .order("created_at");

        if (result.error) {
            comments.textContent = "Comments unavailable.";
        } else {
            result.data.forEach(row => {
                const p = document.createElement("p");
                p.textContent = "💬 " + row.comment;
                comments.appendChild(p);
            });
        }

        const input = document.createElement("textarea");
        input.maxLength = 1000;
        input.placeholder = "Write an anonymous comment...";

        const button = document.createElement("button");
        button.textContent = "Comment anonymously";

        const feedback = document.createElement("p");
        feedback.className = "status";

        button.onclick = async () => {
            const comment = input.value.trim();

            if (!comment) {
                feedback.textContent = "Write a comment first.";
                return;
            }

            feedback.textContent = "Posting...";

            const { error } = await client.rpc(
                "submit_post_comment",
                {
                    p_post_id: post.id,
                    p_comment: comment
                }
            );

            if (error) {
                feedback.textContent = error.message;
                return;
            }

            input.value = "";
            feedback.textContent = "Comment posted!";
            loadPosts();
        };

        card.append(comments, input, button, feedback);
        box.appendChild(card);
    }
}
                   


// BUTTONS
$("signupBtn").onclick = createAccount;
$("createVisitorAccountBtn").onclick = createVisitorAccount;
$("sendAnonymousBtn").onclick = sendAnonymousMessage;
$("refreshInboxBtn").onclick = loadInbox;
$("refreshPostsBtn").onclick = loadPosts;
$("publishPostBtn").onclick = publishPost;

$("copyLinkBtn").onclick = async () => {
    await navigator.clipboard.writeText($("personalLink").value);
    alert("Your link has been copied!");
};

$("shareLinkBtn").onclick = () => {
    const link = $("personalLink").value;

    location.href = "https://wa.me/?text=" +
        encodeURIComponent("Send me an anonymous message: " + link);
};


// OPEN PERSONAL MESSAGE PAGE
if (usernameFromUrl) {
    $("homePage").classList.add("hidden");
    $("publicLinkPage").classList.remove("hidden");

    $("recipientHeading").textContent =
        "Welcome to " + usernameFromUrl + "'s page! 💗";

    loadPosts();
}           


// START WEBSITE
loadPosts();
restoreAccount();
// SHARE A PICTURE DIRECTLY TO WHATSAPP STATUS
$("statusShareBtn").onclick = async () => {
    const file = $("statusPhoto").files[0];

    if (!file) {
        showStatus("statusShareMessage", "Please choose a picture first.");
        return;
    }

    if (!file.type.startsWith("image/")) {
        showStatus("statusShareMessage", "Please choose an image.");
        return;
    }

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: "Share to WhatsApp Status"
            });
        } catch (error) {
            if (error.name !== "AbortError") {
                showStatus("statusShareMessage", "Sharing failed. Please try again.");
            }
        }
    } else {
        showStatus(
            "statusShareMessage",
            "Your browser does not support direct picture sharing. Please try Chrome."
        );
    }
};