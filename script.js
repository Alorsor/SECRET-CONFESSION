// ==========================================
// SECRET CONFESSIONS — SUPABASE CONNECTION
// ==========================================

const SUPABASE_URL = "https://izdosqdrgghnjadihujs.supabase.co";

const SUPABASE_KEY = "sb_publishable_ZbUfnH5BeJOO7yRcKgR_fA_2wJxMIjw";

const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const $ = id => document.getElementById(id);

const usernameFromUrl =
    new URLSearchParams(location.search).get("u");

function showStatus(id, message) {
    const element = $(id);
    if (element) element.textContent = message;
}

function makeElement(tag, text, className) {
    const element = document.createElement(tag);

    if (text !== undefined) {
        element.textContent = text;
    }

    if (className) {
        element.className = className;
    }

    return element;
}

function getPersonalLink(username) {
    return location.origin + location.pathname +
        "?u=" + encodeURIComponent(username);
}


// ==========================================
// CREATE PERSONAL ACCOUNT
// ==========================================

async function createAccount() {
    const username = $("username").value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        showStatus(
            "authStatus",
            "Use 3–20 letters, numbers or underscores."
        );
        return;
    }

    showStatus("authStatus", "Creating your personal link...");

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

        if (!user) {
            throw new Error("Could not create your account. Please try again.");
        }

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

        const { error } = await client
            .from("profiles")
            .insert({
                id: user.id,
                username: username
            });

        if (error) {
            if (error.code === "23505") {
                throw new Error(
                    "That username is already taken. Choose another."
                );
            }

            throw error;
        }

        showAccount(username);

    } catch (error) {
        console.error("Account creation error:", error);
        showStatus("authStatus", error.message);
    }
}


// ==========================================
// CREATE ACCOUNT FROM A VISITOR PAGE
// ==========================================

async function createVisitorAccount() {
    const username = $("visitorUsername").value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        showStatus(
            "visitorAccountStatus",
            "Use 3–20 letters, numbers or underscores."
        );
        return;
    }

    showStatus(
        "visitorAccountStatus",
        "Creating your personal link..."
    );

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
            showStatus(
                "visitorAccountStatus",
                "You already have a personal link: " +
                getPersonalLink(existing.username)
            );
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
                throw new Error(
                    "That username is taken. Try another."
                );
            }

            throw error;
        }

        const link = getPersonalLink(username);

        showStatus(
            "visitorAccountStatus",
            "Your personal link is ready! 💗 " + link
        );

        $("visitorUsername").value = "";

    } catch (error) {
        console.error("Visitor account error:", error);
        showStatus("visitorAccountStatus", error.message);
    }
}


// ==========================================
// SHOW PERSONAL ACCOUNT
// ==========================================

function showAccount(username) {
    $("authForms")?.classList.add("hidden");
    $("accountPanel")?.classList.remove("hidden");
    $("inboxPanel")?.classList.remove("hidden");
    $("createPostPanel")?.classList.remove("hidden");

    if ($("welcomeUser")) {
        $("welcomeUser").textContent =
            "Welcome, " + username + "! ❤️";
    }

    if ($("personalLink")) {
        $("personalLink").value = getPersonalLink(username);
    }

    loadInbox();
}


// ==========================================
// RESTORE ACCOUNT
// ==========================================

async function restoreAccount() {
    try {
        const { data: { session }, error: sessionError } =
            await client.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) return;

        const { data: { user }, error: userError } =
            await client.auth.getUser();

        if (userError) throw userError;
        if (!user) return;

        const { data, error } = await client
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            showAccount(data.username);
        }

    } catch (error) {
        console.error("Account restoration error:", error);
    }
}


// ==========================================
// SEND GENERAL ANONYMOUS MESSAGE
// ==========================================

async function sendAnonymousMessage() {
    const content = $("anonymousMessage").value.trim();

    if (!usernameFromUrl) {
        showStatus("anonymousStatus", "This personal link is invalid.");
        return;
    }

    if (!content) {
        showStatus("anonymousStatus", "Please write a message.");
        return;
    }

    showStatus("anonymousStatus", "Sending...");

    try {
        const { error } = await client.rpc(
            "submit_anonymous_message",
            {
                p_username: usernameFromUrl,
                p_content: content
            }
        );

        if (error) throw error;

        $("anonymousMessage").value = "";

        showStatus(
            "anonymousStatus",
            "Your anonymous message has been sent! 💗"
        );

    } catch (error) {
        console.error("Message error:", error);
        showStatus("anonymousStatus", error.message);
    }
}


// ==========================================
// LOAD PRIVATE INBOX
// ==========================================

async function loadInbox() {
    const box = $("inboxList");

    if (!box) return;

    box.textContent = "Loading messages...";

    try {
        const { data, error } = await client
            .from("messages")
            .select("id, content, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;

        box.replaceChildren();

        if (!data || data.length === 0) {
            box.textContent =
                "No messages yet. Share your personal link!";
            return;
        }

        data.forEach(item => {
            const card = makeElement("article", undefined, "post-card");

            const message = makeElement("p", item.content);

            const date = makeElement(
                "small",
                new Date(item.created_at).toLocaleString()
            );

            const shareButton = makeElement(
                "button",
                "📲 Share on WhatsApp Status"
            );

            shareButton.onclick = async () => {
                const shareText =
                    "Someone sent me an anonymous message 💌\n\n" +
                    '"' + item.content + '"' +
                    "\n\nShared from Secret Confessions ❤️";

                try {
                    if (navigator.share) {
                        await navigator.share({
                            title: "Anonymous Message",
                            text: shareText
                        });
                    } else {
                        await navigator.clipboard.writeText(shareText);
                        alert(
                            "Message copied! Paste it into your WhatsApp Status."
                        );
                    }
                } catch (error) {
                    if (error.name !== "AbortError") {
                        alert("Sharing failed. Please try again.");
                    }
                }
            };

            card.append(message, date, shareButton);
            box.appendChild(card);
        });

    } catch (error) {
        console.error("Inbox error:", error);
        box.textContent = error.message;
    }
}


// ==========================================
// PUBLISH A PICTURE
// ==========================================

async function publishPost() {
    const file = $("postPhoto")?.files[0];
    const caption = $("postCaption")?.value.trim() || "";

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

    try {
        const { data: { user }, error: userError } =
            await client.auth.getUser();

        if (userError) throw userError;

        if (!user) {
            showStatus(
                "postStatus",
                "Please create your username first."
            );
            return;
        }

        showStatus("postStatus", "Uploading picture...");

        const safeName = file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

        const path = user.id + "/" +
            crypto.randomUUID() + "-" + safeName;

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

        showStatus(
            "postStatus",
            "Your picture is now published! ❤️"
        );

        await loadPosts();

    } catch (error) {
        console.error("Publish error:", error);
        showStatus("postStatus", error.message);
    }
}


// ==========================================
// SEND A PRIVATE MESSAGE ABOUT A POST
// ==========================================

async function sendPostMessage(username, postId, input, feedback) {
    const content = input.value.trim();

    if (!content) {
        feedback.textContent = "Please write a message.";
        return;
    }

    feedback.textContent = "Sending...";

    try {
        const { error } = await client.rpc(
            "submit_anonymous_message",
            {
                p_username: username,
                p_content: content,
                p_post_id: postId
            }
        );

        if (error) throw error;

        input.value = "";
        feedback.textContent = "Your private message was sent! 💗";

    } catch (error) {
        console.error("Post message error:", error);
        feedback.textContent = error.message;
    }
}


// ==========================================
// LOAD POSTS
// ==========================================

async function loadPosts() {
    const box = usernameFromUrl
        ? $("personalPostsList")
        : $("postsList");

    if (!box) return;

    box.textContent = "Loading pictures...";

    try {
        let query = client
            .from("posts")
            .select("id, author_id, caption, image_url, created_at")
            .order("created_at", { ascending: false })
            .limit(50);

        let ownerId = null;

        if (usernameFromUrl) {
            const { data: owner, error: ownerError } = await client
                .from("profiles")
                .select("id")
                .eq("username", usernameFromUrl.toLowerCase())
                .maybeSingle();

            if (ownerError) throw ownerError;

            if (!owner) {
                box.textContent = "This personal link could not be found.";
                return;
            }

            ownerId = owner.id;
            query = query.eq("author_id", ownerId);
        }

        const { data, error } = await query;

        if (error) throw error;

        box.replaceChildren();

        if (!data || data.length === 0) {
            box.textContent = "No pictures have been published yet.";
            return;
        }

        const { data: { user } } = await client.auth.getUser();

        for (const post of data) {
            const card = makeElement(
                "article",
                undefined,
                "post-card"
            );

            const image = makeElement("img");
            image.src = post.image_url;
            image.alt = "Published picture";
            image.loading = "lazy";

            const caption = makeElement(
                "p",
                post.caption || ""
            );

            const date = makeElement(
                "small",
                new Date(post.created_at).toLocaleString()
            );

            card.append(image, caption, date);

            // Delete button for the owner only.
            if (user && user.id === post.author_id) {
                const deleteButton = makeElement(
                    "button",
                    "🗑️ Delete Picture",
                    "secondary"
                );

                deleteButton.onclick = async () => {
                    if (!confirm("Are you sure you want to delete this picture?")) {
                        return;
                    }

                    deleteButton.disabled = true;
                    deleteButton.textContent = "Deleting...";

                    const { error: deleteError } = await client
                        .from("posts")
                        .delete()
                        .eq("id", post.id);

                    if (deleteError) {
                        alert(
                            "Could not delete picture: " +
                            deleteError.message
                        );

                        deleteButton.disabled = false;
                        deleteButton.textContent = "🗑️ Delete Picture";
                        return;
                    }

                    await loadPosts();
                };

                card.appendChild(deleteButton);
            }

            // Comments section.
            const comments = makeElement(
                "div",
                undefined,
                "comments"
            );

            const { data: commentRows, error: commentError } =
                await client
                    .from("post_comments")
                    .select("comment")
                    .eq("post_id", post.id)
                    .order("created_at", { ascending: true });

            if (commentError) {
                comments.textContent = "Comments unavailable.";
            } else if (commentRows.length === 0) {
                comments.textContent = "No comments yet.";
            } else {
                commentRows.forEach(row => {
                    const comment = makeElement(
                        "p",
                        "💬 " + row.comment
                    );

                    comments.appendChild(comment);
                });
            }

            const commentInput = makeElement("textarea");
            commentInput.maxLength = 1000;
            commentInput.placeholder =
                "Write an anonymous comment...";

            const commentButton = makeElement(
                "button",
                "Comment anonymously"
            );

            const commentFeedback = makeElement(
                "p",
                "",
                "status"
            );

            commentButton.onclick = async () => {
                const comment = commentInput.value.trim();

                if (!comment) {
                    commentFeedback.textContent =
                        "Write a comment first.";
                    return;
                }

                commentButton.disabled = true;
                commentFeedback.textContent = "Posting...";

                try {
                    const { error: submitError } = await client.rpc(
                        "submit_post_comment",
                        {
                            p_post_id: post.id,
                            p_comment: comment
                        }
                    );

                    if (submitError) throw submitError;

                    commentInput.value = "";
                    commentFeedback.textContent = "Comment posted!";

                    await loadPosts();

                } catch (error) {
                    commentFeedback.textContent = error.message;
                    commentButton.disabled = false;
                }
            };

            card.append(
                comments,
                commentInput,
                commentButton,
                commentFeedback
            );

            // Private message form appears on personal pages only.
            if (usernameFromUrl) {
                const privateHeading = makeElement(
                    "h4",
                    "Send a private message about this picture 💌"
                );

                const privateInput = makeElement("textarea");
                privateInput.maxLength = 2000;
                privateInput.placeholder =
                    "Write your private anonymous message...";

                const privateButton = makeElement(
                    "button",
                    "Send private message"
                );

                const privateFeedback = makeElement(
                    "p",
                    "",
                    "status"
                );

                privateButton.onclick = async () => {
                    privateButton.disabled = true;

                    await sendPostMessage(
                        usernameFromUrl,
                        post.id,
                        privateInput,
                        privateFeedback
                    );

                    privateButton.disabled = false;
                };

                card.append(
                    privateHeading,
                    privateInput,
                    privateButton,
                    privateFeedback
                );
            }

            box.appendChild(card);
        }

    } catch (error) {
        console.error("Load posts error:", error);
        box.textContent = error.message;
    }
}


// ==========================================
// SHARE A PHOTO TO WHATSAPP STATUS
// ==========================================

async function shareStatusPhoto() {
    const file = $("statusPhoto")?.files[0];

    if (!file) {
        showStatus(
            "statusShareMessage",
            "Please choose a picture first."
        );
        return;
    }

    if (!file.type.startsWith("image/")) {
        showStatus(
            "statusShareMessage",
            "Please choose an image file."
        );
        return;
    }

    try {
        showStatus(
            "statusShareMessage",
            "Preparing your picture..."
        );

        const shareData = {
            files: [file],
            title: "Secret Confessions",
            text: "Shared from Secret Confessions ❤️"
        };

        if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({ files: [file] })
        ) {
            await navigator.share(shareData);

            showStatus(
                "statusShareMessage",
                "Choose WhatsApp Status in the sharing options."
            );
        } else {
            const downloadLink = document.createElement("a");

            downloadLink.href = URL.createObjectURL(file);
            downloadLink.download = file.name || "status-photo.jpg";

            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();

            URL.revokeObjectURL(downloadLink.href);

            showStatus(
                "statusShareMessage",
                "Picture downloaded. Open WhatsApp and add it to your Status."
            );
        }

    } catch (error) {
        if (error.name !== "AbortError") {
            console.error("Photo sharing error:", error);

            showStatus(
                "statusShareMessage",
                "Could not share the picture. Please try again."
            );
        }
    }
}


// ==========================================
// BUTTONS AND EVENT LISTENERS
// ==========================================

function connectButton(id, action) {
    const button = $(id);

    if (button) {
        button.addEventListener("click", action);
    }
}

connectButton("signupBtn", createAccount);

connectButton(
    "createVisitorAccountBtn",
    createVisitorAccount
);

connectButton(
    "sendAnonymousBtn",
    sendAnonymousMessage
);

connectButton("refreshInboxBtn", loadInbox);

connectButton("refreshPostsBtn", loadPosts);

connectButton("publishPostBtn", publishPost);

connectButton("statusShareBtn", shareStatusPhoto);


// Copy personal link.
connectButton("copyLinkBtn", async () => {
    try {
        await navigator.clipboard.writeText(
            $("personalLink").value
        );

        alert("Your link has been copied!");

    } catch (error) {
        alert("Could not copy the link. Please copy it manually.");
    }
});


// Share personal link through WhatsApp.
connectButton("shareLinkBtn", () => {
    const link = $("personalLink").value;

    const text =
        "Send me an anonymous message: " + link;

    location.href =
        "https://wa.me/?text=" + encodeURIComponent(text);
});


// ==========================================
// OPEN PERSONAL LINK PAGE
// ==========================================

if (usernameFromUrl) {
    $("homePage")?.classList.add("hidden");
    $("publicLinkPage")?.classList.remove("hidden");

    if ($("recipientHeading")) {
        $("recipientHeading").textContent =
            "Welcome to " + usernameFromUrl + "'s page! 💗";
    }
}


// ==========================================
// START WEBSITE
// ==========================================

async function startWebsite() {
    await restoreAccount();
    await loadPosts();
}

startWebsite();