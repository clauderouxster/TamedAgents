// =============================================
// IMAGES GALLERY
// ---------------------------------------------
// Manages the "Images" section (next to User Data and Output).
// Each image is stored as { name, src, isUrl } where:
//   - src   : a data URL (local image, base64) or an http(s) URL (remote image)
//   - isUrl : true when the image is a remote URL, false for a local file
// Images are referenced by their index (0-based) in the gallery, which is the
// id used by the LispE instruction add_image_to_chat(chat, id_image).
// =============================================

let imageItems = [];

// ---- Core model -----------------------------------------------------------

// Add an image to the gallery, returns its index.
function addImageItem(name, src, isUrl) {
    imageItems.push({ name: name || `image_${imageItems.length}`, src: src, isUrl: !!isUrl });
    renderImagesGallery();
    if (typeof markSessionModified === 'function') markSessionModified();
    return imageItems.length - 1;
}

// Remove an image by index.
function removeImageItem(index) {
    if (index < 0 || index >= imageItems.length) return;
    imageItems.splice(index, 1);
    renderImagesGallery();
    if (typeof markSessionModified === 'function') markSessionModified();
}

// Remove every image from the gallery.
function clearImagesGallery() {
    imageItems = [];
    renderImagesGallery();
    if (typeof markSessionModified === 'function') markSessionModified();
}

// Reset to an empty gallery (used by the global Reset button).
function resetImagesGallery() {
    imageItems = [];
    renderImagesGallery();
}

// Return a shallow copy of all images (for session persistence).
function getAllImages() {
    return imageItems.map(it => ({ name: it.name, src: it.src, isUrl: it.isUrl }));
}

// Replace the whole gallery (used when loading a session).
function setAllImages(items) {
    imageItems = Array.isArray(items)
        ? items.map(it => ({ name: it.name, src: it.src, isUrl: !!it.isUrl }))
        : [];
    renderImagesGallery();
}

// ---- Rendering ------------------------------------------------------------

function renderImagesGallery() {
    const gallery = document.getElementById('imagesGallery');
    if (!gallery) return;
    gallery.innerHTML = '';

    if (imageItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'images-gallery-empty';
        empty.textContent = 'No image yet. Drag & drop an image into the message box.';
        gallery.appendChild(empty);
        return;
    }

    imageItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';

        const thumb = document.createElement('img');
        thumb.className = 'image-thumb';
        thumb.src = item.src;
        thumb.alt = item.name;
        thumb.title = item.name;

        const meta = document.createElement('div');
        meta.className = 'image-meta';
        meta.innerHTML = `<span class="image-index">#${index}</span>`
            + `<span class="image-name" title="${item.name}">${item.name}</span>`
            + `<span class="image-kind">${item.isUrl ? 'URL' : 'local'}</span>`;

        const actions = document.createElement('div');
        actions.className = 'image-actions';

        const attachBtn = document.createElement('button');
        attachBtn.className = 'image-action-btn';
        attachBtn.title = 'Attach to current chat';
        attachBtn.textContent = '➕';
        attachBtn.addEventListener('click', () => integrateImageIntoCurrentChat(index));

        const delBtn = document.createElement('button');
        delBtn.className = 'image-action-btn';
        delBtn.title = 'Remove image';
        delBtn.textContent = '🗑️';
        delBtn.addEventListener('click', () => removeImageItem(index));

        actions.appendChild(attachBtn);
        actions.appendChild(delBtn);

        card.appendChild(thumb);
        card.appendChild(meta);
        card.appendChild(actions);
        gallery.appendChild(card);
    });
}

// ---- Chat integration -----------------------------------------------------

// Images staged to be attached to the next user message typed in the input.
let pendingChatImages = [];

// Add the image at the given index to the pending attachments of the chat input,
// so that the text typed afterwards is associated with this image on send.
function integrateImageIntoCurrentChat(index) {
    if (index < 0 || index >= imageItems.length) return;
    const item = imageItems[index];
    stagePendingImage({ src: item.src, isUrl: item.isUrl, name: item.name });
}

// Stage an image as a pending attachment for the next message.
function stagePendingImage(item) {
    if (!item || !item.src) return;
    pendingChatImages.push({ src: item.src, isUrl: !!item.isUrl, name: item.name || 'image' });
    renderPendingPreview();
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.focus();
}

// Remove a pending attachment by index.
function removePendingImage(index) {
    if (index < 0 || index >= pendingChatImages.length) return;
    pendingChatImages.splice(index, 1);
    renderPendingPreview();
}

// Return (and detach) the currently pending attachments.
function takePendingImages() {
    const imgs = pendingChatImages;
    pendingChatImages = [];
    renderPendingPreview();
    return imgs;
}

// Number of pending attachments.
function getPendingImagesCount() {
    return pendingChatImages.length;
}

// Discard any pending attachments (e.g. on reset).
function clearPendingImages() {
    pendingChatImages = [];
    renderPendingPreview();
}

// Render the pending-attachment preview strip below the chat input.
function renderPendingPreview() {
    const preview = document.getElementById('chatImagePreview');
    if (!preview) return;
    preview.innerHTML = '';
    if (pendingChatImages.length === 0) {
        preview.style.display = 'none';
        return;
    }
    preview.style.display = '';
    pendingChatImages.forEach((item, index) => {
        const chip = document.createElement('div');
        chip.className = 'chat-image-chip';

        const thumb = document.createElement('img');
        thumb.src = item.src;
        thumb.alt = item.name;
        thumb.title = item.name;

        const remove = document.createElement('button');
        remove.className = 'chat-image-chip-remove';
        remove.title = 'Remove attachment';
        remove.textContent = '✕';
        remove.addEventListener('click', () => removePendingImage(index));

        chip.appendChild(thumb);
        chip.appendChild(remove);
        preview.appendChild(chip);
    });
}

// ---- JS <-> LispE bridge --------------------------------------------------
// These functions are invoked from LispE through (evaljs ...). They return
// base64-encoded strings (consistent with the other bridge functions).

// Image quality/detail level sent to the LLM ('auto' | 'low' | 'high').
function getImageDetail() {
    const sel = document.getElementById('imageDetailSelect');
    const v = sel ? sel.value : 'auto';
    return (v === 'low' || v === 'high') ? v : 'auto';
}

// Number of images in the gallery.
function getImageSize() {
    return imageItems.length;
}

// Return a single image as base64-encoded JSON {name, src, isUrl}.
function getImageValue(idx) {
    const i = parseInt(idx, 10);
    if (isNaN(i) || i < 0 || i >= imageItems.length) {
        return unicodeBtoa(JSON.stringify({ name: '', src: '', isUrl: false, error: `Invalid image index: ${idx}` }));
    }
    const it = imageItems[i];
    return unicodeBtoa(JSON.stringify({ name: it.name, src: it.src, isUrl: it.isUrl }));
}

// Return all images as base64-encoded JSON array.
function getImageData() {
    return unicodeBtoa(JSON.stringify(getAllImages()));
}

// Add an image from base64-encoded JSON {name, src, isUrl}; returns its index.
function pushImageValue(base64json) {
    try {
        const obj = JSON.parse(unicodeAtob(base64json));
        return addImageItem(obj.name, obj.src, obj.isUrl);
    } catch (e) {
        return -1;
    }
}

// ---- File loading helpers -------------------------------------------------

function loadImageFiles(fileList, integrate) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const index = addImageItem(file.name, e.target.result, false);
            if (integrate) integrateImageIntoCurrentChat(index);
        };
        reader.readAsDataURL(file);
    });
}

// Handle a drop event's dataTransfer: add image files / image URL to the gallery.
// When integrate is true, the image is also attached to the current chat.
function handleImageDrop(dt, integrate) {
    if (!dt) return false;
    const hasFiles = dt.files && dt.files.length > 0;
    const uri = dt.getData ? (dt.getData('text/uri-list') || dt.getData('text/plain')) : '';
    const isImageUrl = uri && /^https?:\/\//i.test(uri.trim());

    if (hasFiles) {
        loadImageFiles(dt.files, integrate);
        return true;
    }
    if (isImageUrl) {
        const trimmed = uri.trim().split('\n')[0].trim();
        const name = trimmed.split('/').pop() || 'image';
        const index = addImageItem(name, trimmed, true);
        if (integrate) integrateImageIntoCurrentChat(index);
        return true;
    }
    return false;
}

// Attach drag & drop image handling to an element.
function attachImageDropZone(zone, integrate) {
    if (!zone) return;
    const onDragOver = (e) => {
        if (e.dataTransfer && Array.from(e.dataTransfer.types || []).some(
            t => t === 'Files' || t === 'text/uri-list')) {
            e.preventDefault();
            zone.classList.add('image-drop-hover');
        }
    };
    const onDragLeave = () => zone.classList.remove('image-drop-hover');

    zone.addEventListener('dragover', onDragOver);
    zone.addEventListener('dragleave', onDragLeave);
    zone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        const handled = handleImageDrop(dt, integrate);
        if (handled) {
            e.preventDefault();
            zone.classList.remove('image-drop-hover');
        }
    });
}

// ---- UI wiring ------------------------------------------------------------

(function setupImagesUI() {
    const fileInput = document.getElementById('imageFileInput');
    const loadBtn = document.getElementById('loadImageFileButton');
    const urlBtn = document.getElementById('addImageUrlButton');
    const clearBtn = document.getElementById('clearImagesButton');

    if (loadBtn && fileInput) {
        loadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            loadImageFiles(fileInput.files, false);
            fileInput.value = '';
        });
    }

    if (urlBtn) {
        urlBtn.addEventListener('click', () => {
            const url = prompt('Image URL:');
            if (url && url.trim()) {
                const trimmed = url.trim();
                const name = trimmed.split('/').pop() || 'image';
                addImageItem(name, trimmed, true);
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => clearImagesGallery());
    }

    // ---- Drag & drop onto the message input (auto-attach to chat) ----------
    const chatInput = document.getElementById('chatInput');
    const chatDropZone = document.querySelector('.chat-input-wrapper') || chatInput;
    attachImageDropZone(chatDropZone, true);

    // ---- Drag & drop onto the Images section (gallery only, no chat) -------
    attachImageDropZone(document.getElementById('panelImages'), false);

    renderImagesGallery();
    renderPendingPreview();
})();
