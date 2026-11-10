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
            p_content: content
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
    });
}

// PUBLISH A PICTURE
async function publishPost() {
    const file = $("postPhoto").files[0];
    const caption = $("postCaption").value.trim();

    if (!file) {
        showStatus("postStatus", "Please choose a picture.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showStatus("postStatus", "Picture must be smaller than 5 MB.");
        return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showStatus("postStatus", "Choose JPG, PNG or WEBP.");
        return;
    }

    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        showStatus("postStatus", "Please create your username first.");
        return;
    }

    showStatus("postStatus", "Uploading picture...");

    try {
        const path = user.id + "/" + crypto.randomUUID() +
            "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        const { error: uploadError } = await client.storage
            .from("community-posts")
            .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = client.storage
            .from("community-posts")
            .getPublicUrl(path);

        const { error } = await client
            .from("posts")
            .insert({
                author_id: user.id,
                caption: caption,
                image_url: urlData.publicUrl
            });

        if (error) throw error;

        $("postCaption").value = "";
        $("postPhoto").value = "";

        showStatus("postStatus", "Your picture is now published! ❤️");

        loadPosts();

    } catch (error) {
        showStatus("postStatus", error.message);
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

    // If someone is viewing a personal link,
    // show only that owner's pictures.
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

        card.append(image, caption, comments, input, button, feedback);
        box.appendChild(card);
    }
}
                   


// BUTTONS
$("signupBtn").onclick = createAccount;
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