/* ------------------------------
   Global Variables & Data Structures
------------------------------ */
let startX, startY, isDragging = false;
let shouldAnimate = true;

/* Storing Multi-Branch History: { "unitIndex": [ {role:"user"/"assistant"/"system", content:"..."}, ... ] } */
const conversationMap = {};

let internalPrompt = "Make sure your responses are not too long, about 50 words. also reflect on the prompts and make sure you question assumptions towards more inclusive and equitable knowledge exploration.";            // 内置提示词
let internalPromptEditable = true; 

let currentlyHighlightedUnitElement = null;  // DOM element of the highlighted .interactive-unit
let currentlyHighlightedTitleElement = null; // DOM element in the journey panel

// Save "unitIndex" => "color"
const highlightColorMap = {};

// Prepare a list of colours, which can also be randomly generated.
const colorPalette = [
  "#FF5722", 
  "#9C27B0", 
  "#3F51B5", 
  "#009688", 
  "#E91E63", 
  // Can add more
];
let colorIndex = 0; // For cycling colours


/* ------------------------------
   1. DOMContentLoaded: Bind Button & Initialisation
------------------------------ */
document.addEventListener('DOMContentLoaded', function () {
  // 1) Setting button
  const settingBtn = document.getElementById('setting-btn');
  if (settingBtn) {
    settingBtn.addEventListener('click', () => {
      if (!internalPromptEditable) {
        alert("The internal prompt has been locked and can no longer be modified");
        return;
      }
      const pwd = prompt("Password：");
      if (pwd === "2025") {
        const newPrompt = prompt("Please input prompt：", internalPrompt);
        if (newPrompt !== null) {
          internalPrompt = newPrompt;
          alert("The internal prompt has been saved");
        }
      } else {
        alert("Incorrect password!");
      }
    });
  }

  // 2) About 
  const aboutBtn = document.getElementById('about-btn');
  const aboutModal = document.getElementById('aboutModal');
  const aboutModalClose = document.getElementById('aboutModalClose');
  if (aboutBtn && aboutModal && aboutModalClose) {
    aboutBtn.addEventListener('click', () => {
      aboutModal.style.display = 'block';
    });
    aboutModalClose.addEventListener('click', () => {
      aboutModal.style.display = 'none';
    });
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        aboutModal.style.display = 'none';
      }
    });
  }

  // 3) Help 
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('helpModal');
  const helpModalClose = document.getElementById('helpModalClose');
  if (helpBtn && helpModal && helpModalClose) {
    helpBtn.addEventListener('click', () => {
      helpModal.style.display = 'block';
    });
    helpModalClose.addEventListener('click', () => {
      helpModal.style.display = 'none';
    });
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.style.display = 'none';
      }
    });
  }

  // 4) Save => export DOC
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const docName = prompt("Save your exploration journey as .dox, you can choose to add notes below:");
      if (docName && docName.trim() !== "") {
        saveSession(docName.trim());
      }
    });
  }

  // 5) (Unused) New "Export" button => Export whole page to PDF.
  const exportPageBtn = document.getElementById('export-page-btn');
  if (exportPageBtn) {
    exportPageBtn.addEventListener('click', exportPageAsHtml);
  }

  // 6) Disable empty input => run/next button
  document.querySelectorAll('.interactive-unit').forEach(unit => {
    const input = unit.querySelector('input[type="text"]');
    if (!input) return;
    const runBtn = unit.querySelector('.run-button');
    const nextBtn = unit.querySelector('.next-button');

    toggleButtonState(input, runBtn);
    toggleButtonState(input, nextBtn);
    
    input.addEventListener('input', () => {
      toggleButtonState(input, runBtn);
      toggleButtonState(input, nextBtn);
    });
  });

  // 7) journey
  const journeyToggleBtn = document.getElementById('journey-toggle-btn');
  const journeyPanel = document.getElementById('journeyPanel'); 

  if (journeyToggleBtn && journeyPanel) {
    journeyToggleBtn.addEventListener('click', () => {
      // 1) Toggle button background colour (add/remove .toggled class)
      journeyToggleBtn.classList.toggle('toggled');

      // 2) Toggle the expand/collapse of the Journey panel at the same time.
      const isOpen = journeyPanel.classList.toggle('open');

       if (!isOpen) {
        clearAllHighlights();
      }
    });
  }

  //8) summary 
  const summaryBtn = document.getElementById('summary-btn');
  if (summaryBtn) {
    summaryBtn.addEventListener('click', async () => {
      // 1) Collect complete dialogues with multiple branches
      const conversationData = collectAllConversationData();
      // 2) Summary of requests to the backend
      const summaryText = await requestSummary(conversationData);
      // 3) Show summary pop-up
      showSummaryModal(summaryText);
    });
  }

  // Close Summary Modal
  const summaryModalClose = document.getElementById('summaryModalClose');
  const summaryModal = document.getElementById('summaryModal');
  if (summaryModal && summaryModalClose) {
    summaryModalClose.addEventListener('click', () => {
      summaryModal.style.display = 'none';
    });
    summaryModal.addEventListener('click', (e) => {
      if (e.target === summaryModal) {
        summaryModal.style.display = 'none';
      }
    });
  }
});

//Collecting UNIT records to generate summaries
function collectAllConversationData() {
  // conversationMap's structure： { "unitIndex": [ {role, content}, ... ] }
  
  const result = [];

  for (const unitIndex in conversationMap) {
    const messages = conversationMap[unitIndex];
    result.push({ unitIndex, messages });
  }
  return result;
}

async function requestSummary(conversationData) {
  try {
    const res = await fetch('/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationData }) 
      // conversationData is the back array from collectAllConversationData() 
    });
    const data = await res.json();
    if (data.error) {
      return "Error: " + data.error;
    }
    return data.summary || "No summary returned.";
  } catch (err) {
    console.error("Summary request error:", err);
    return "Error calling summary API.";
  }
}

function showSummaryModal(summaryText) {
  const summaryModal = document.getElementById('summaryModal');
  const summaryBody = document.getElementById('summaryModalBody');
  if (!summaryModal || !summaryBody) return;

  // Fill in the summary returned by the backend into the
  summaryBody.textContent = summaryText;
  // Or use innerHTML, and do more if you want to preserve line breaks/formatting.
  summaryModal.style.display = 'block';
}


/* This function can also be called to bind disable logic to the new input when dynamically generating subunits */
function initInputButtonDisable(parent) {
  parent.querySelectorAll('.interactive-unit').forEach(unit => {
    const input = unit.querySelector('input[type="text"]');
    if (!input) return;

    const runBtn = unit.querySelector('.run-button');
    const nextBtn = unit.querySelector('.next-button');

    toggleButtonState(input, runBtn);
    toggleButtonState(input, nextBtn);

    input.addEventListener('input', () => {
      toggleButtonState(input, runBtn);
      toggleButtonState(input, nextBtn);
    });
  });
}

function toggleButtonState(input, btn) {
  if (!btn) return;
  btn.disabled = !input.value.trim();
}

/* ------------------------------
   Save data to Word (HTML->.doc)
------------------------------ */
function saveSession(docName) {
  let htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${docName}</title>
      <style>
        body { font-family: sans-serif; }
        .unit-block {
          margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 8px;
        }
        .unit-title { font-weight: bold; margin-bottom: 5px; }
        .user-input { color: #444; margin-bottom: 5px; }
        .assistant-response {
          background: #f0f0f0; padding: 5px; border-radius: 5px; margin-bottom: 5px;
        }
        .image-container img {
          max-width: 300px; display: block; margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <h1>${docName}</h1>
      <p>This document was exported from the “Co-Teleological Space” interactive prototype</p>
  `;

  const units = document.querySelectorAll('.interactive-unit');
  units.forEach(unit => {
    const unitTitle = unit.querySelector('div')?.textContent || "(No Title)";
    const inputBox = unit.querySelector('input[type="text"]');
    const userInputVal = inputBox ? inputBox.value.trim() : "";
    const responseDiv = unit.querySelector('.response');
    const assistantResponse = responseDiv ? responseDiv.textContent.trim() : "";

    let imageHTML = "";
    const imageContainer = unit.querySelector('.image-container');
    if (imageContainer) {
      const imgs = imageContainer.querySelectorAll('img');
      imgs.forEach(img => {
        imageHTML += `<img src="${img.src}" alt="Generated Image" />`;
      });
    }
    htmlContent += `
      <div class="unit-block">
        <div class="unit-title">${unitTitle}</div>
        <div class="user-input">User Input: ${userInputVal || "(no user input)"}</div>
        <div class="assistant-response">Assistant: ${assistantResponse || "(no response)"}</div>
        <div class="image-container">${imageHTML}</div>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = docName + ".doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/* ------------------------------
   View Drag and Drop
------------------------------ */
document.getElementById('viewport').addEventListener('mousedown', function (e) {
  if (e.button === 0) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    document.body.style.cursor = 'grabbing';
    shouldAnimate = false;
  }
});
document.getElementById('viewport').addEventListener('mouseup', function (e) {
  if (e.button === 0) {
    isDragging = false;
    document.body.style.cursor = 'grab';
    shouldAnimate = true;
    updateFloatingRootprompt();
  }
});
document.getElementById('viewport').addEventListener('mousemove', function (e) {
  if (isDragging) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const container = document.getElementById('root');
    const matrix = new DOMMatrix(getComputedStyle(container).transform);
    matrix.e += dx;
    matrix.f += dy;
    container.style.transition = 'none';
    container.style.transform = matrix.toString();
    startX = e.clientX;
    startY = e.clientY;
  }
});

/* ------------------------------
   Wheel Zoom
------------------------------ */
// Setting the maximum and minimum values for scaling
const MAX_SCALE = 2.0; 
const MIN_SCALE = 0.5; 

document.getElementById('viewport').addEventListener('wheel', function (e) {
  e.preventDefault();
  const scaleFactor = (e.deltaY < 0) ? 1.2 : 0.8;

  const container = document.getElementById('root');
  const matrix = new DOMMatrix(getComputedStyle(container).transform);

  // Get the current zoom ratio
  const currentScale = matrix.a; 
  // Calculate new scaling
  let newScale = currentScale * scaleFactor;
  // Limit scaling to between maximum and minimum values
  newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
  // Update the matrix according to the new scaling
  const newMatrix = matrix.scale(newScale / currentScale);
  container.style.transform = newMatrix.toString();
  updateFloatingRootprompt();
}, { passive: false });

/* ------------------------------
   Interacting with the backend: generateMultipleResponses
------------------------------ */
async function generateMultipleResponses(tempHistory) {
  const res = await fetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: tempHistory })
  });
  const data = await res.json();
  return data; 
}

/* ------------------------------
   onRunClick: Root/subunit "Run"
------------------------------ */
function onRunClick(button) {
  const parentUnit = button.closest('.interactive-unit');
  const parentIndex = parentUnit.dataset.index || "";

  // Disable buttons to avoid repeated clicks
  button.disabled = true;

  // If root unit => fade out bottom message
  if (parentIndex === "") {
    const bottomInfo = document.querySelector('.bottom-info');
    if (bottomInfo) {
      bottomInfo.classList.add('hidden');
    }
    if (internalPromptEditable) {
      internalPromptEditable = false;
    }
    // Make the root input box disabled
    const rootInput = parentUnit.querySelector('input[type="text"]');
    if (rootInput) {
      rootInput.disabled = true;
    }
  }

  const input = parentUnit.querySelector('input[type="text"]');
  const userInput = input.value.trim();
  if (!userInput) return; 
  updateFloatingRootprompt();
  spawnChildUnits(parentUnit, userInput);
}

/* ------------------------------
   spawnChildUnits: One request => generate 3 sub-cells
   Modify: append the containers of the subunits to "this unit".
         Add a collapse button to the top right corner of non-root units.
------------------------------ */
async function spawnChildUnits(parentUnit, newUserInput) {
  const parentIndex = parentUnit.dataset.index || "";
  const currentLevel = parseInt(parentUnit.style.getPropertyValue("--level")) + 1 || 1;

  if (!conversationMap[parentIndex]) {
    conversationMap[parentIndex] = [];
  }
  const tempHistory = JSON.parse(JSON.stringify(conversationMap[parentIndex]));

  // If it's a root unit && has a built-in prompt
  if (parentIndex === "" && internalPrompt.trim()) {
    tempHistory.push({ role: "system", content: internalPrompt });
  }
  tempHistory.push({ role: "user", content: newUserInput });

  // ================ 1) Show loading before request================
  const parentRespDiv = parentUnit.querySelector('.response');
  if (parentRespDiv) {
    showLoading(parentRespDiv);
  }

  let replies;
  try {
    // Call the backend to get replies from all three branches
    replies = await generateMultipleResponses(tempHistory);
  } catch (err) {
    console.error("Error fetching multiple responses:", err);
    // Hide loading even when things go wrong
    if (parentRespDiv) hideLoading(parentRespDiv);
    return;
  }

  // ================ 2) Hide loading after a successful request ================
  if (parentRespDiv) {
    hideLoading(parentRespDiv);
  }

  // Layered colour matching
  const altColors = ['#ffffff', '#f6f6f6'];
  const bgColor = altColors[(currentLevel - 1) % altColors.length];

  // Create a container for 3 sub-units.
  const container = document.createElement('div');
  container.className = 'children-container';
  container.style.display = 'flex';
  container.style.justifyContent = 'space-around';
  container.style.width = '100%';

  for (let i = 0; i < 3; i++) {
    const childIndex = `${parentIndex}.${i + 1}`;
    const unit = document.createElement('div');
    unit.className = 'interactive-unit';
    unit.dataset.index = childIndex;
    unit.style.setProperty("--level", currentLevel);
    unit.style.setProperty("--bg-color", bgColor);

    unit.innerHTML = `
      <div class="unit-title" data-unit-index="${childIndex}" style="position: relative; width:100%;">
        Unit-${childIndex}
        ${childIndex !== "" ? `<button class="collapse-btn"></button>` : ""}
      </div>
      <div class="input-row">
        <input type="text" placeholder="Enter your prompt here">
        <button class="button run-button">
          <img src="/static/send.png" alt="Run" />
        </button>
        <button class="button generate-button">
          <img src="/static/gene.png" alt="Generate" />
        </button>
      </div>
      <div class="response"></div>
      <div class="image-container" style="margin-top:5px;"></div>
    `;
    container.appendChild(unit);

    // Initialising subunit history
    conversationMap[childIndex] = JSON.parse(JSON.stringify(tempHistory));
    const currentReply = replies && replies[i] ? replies[i] : "No response";
    conversationMap[childIndex].push({ role: "assistant", content: currentReply });

    const responseDiv = unit.querySelector('.response');
    responseDiv.textContent = currentReply;

    // Next button => generate next level
    const runBtn = unit.querySelector('.run-button');
    runBtn.addEventListener('click', () => {
      runBtn.disabled = true;
      const childInput = unit.querySelector('input[type="text"]');
      const val = childInput.value.trim();
      if (!val) return;
      spawnChildUnits(unit, val);
    });

    // Generate button => call image generation
    const generateBtn = unit.querySelector('.generate-button');
    if (childIndex === "") {
      generateBtn.style.display = 'none';
    } else {
      generateBtn.addEventListener('click', () => {
        generateImage(childIndex, unit);
      });
    }

    // Folding Button Logic
    const collapseBtn = unit.querySelector('.collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        const childContainer = unit.querySelector('.children-container');
        if (childContainer) {
          if (childContainer.style.display === 'none') {
            // unfold
            childContainer.style.display = 'flex';
            collapseBtn.classList.remove('collapsed');
          } else {
            // collapse
            childContainer.style.display = 'none';
            collapseBtn.classList.add('collapsed');
          }
        }
      });
    }

    // Click title => left side pannel for Journey
    const titleDiv = unit.querySelector('.unit-title');
    if (titleDiv) {
      titleDiv.addEventListener('click', () => {
        clearAllHighlights();
        const clickedIndex = titleDiv.getAttribute('data-unit-index');
        showJourney(clickedIndex);
      });
    }
  }

  parentUnit.appendChild(container);

  // Centred animation
  setTimeout(() => centerElement(container), 10);

  // disabled logic
  initInputButtonDisable(container);
}


/* ------------------------------
   Generate Journey
------------------------------ */
function getParentChain(unitIndex) {
  // If root
  if (unitIndex === "") return [""]; 

  const parts = unitIndex.split('.');
  const chain = [];
  for (let i = 0; i < parts.length; i++) {
    const subIndex = parts.slice(0, i+1).join('.');
    chain.push(subIndex);
  }
  return chain;
}

function showJourney(unitIndex) {
  const journeyPanel = document.getElementById('journeyPanel');
  const journeyPanelContent = document.getElementById('journeyPanelContent');
  if (!journeyPanel || !journeyPanelContent) return;

  // 1) Building an index chain
  const chain = getParentChain(unitIndex);

  // 2) Building HTML
  let html = '';
  chain.forEach(idx => {
    const messages = conversationMap[idx];
    if (!messages) return;

    const displayName = (idx === '') ? 'Root' : `Unit-${idx}`;

    // Find the user/assistant at the end of the unit.
    let lastAssistantMsg = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantMsg = messages[i];
        break;
      }
    }
    let lastUserMsg = null;
    if (lastAssistantMsg) {
      const assistantIndex = messages.indexOf(lastAssistantMsg);
      for (let j = assistantIndex - 1; j >= 0; j--) {
        if (messages[j].role === 'user') {
          lastUserMsg = messages[j];
          break;
        }
      }
    }

    // HTML block
    html += `
      <div class="journey-unit-block">
        <div class="journey-unit-title" data-target-index="${idx}">
          <h3>${displayName}</h3>
        </div>
    `;
    if (lastUserMsg) {
      html += `<div class="message-item message-user">User: ${lastUserMsg.content}</div>`;
    }
    if (lastAssistantMsg) {
      html += `<div class="message-item message-assistant">Assistant: ${lastAssistantMsg.content}</div>`;
    }
    html += `</div>`;
  });

  // 3) Write Panel & Expand
  journeyPanelContent.innerHTML = html;
  journeyPanel.classList.add('open');

  // 4) Bind title click event: does not clear existing highlights, only assigns colours to new cells
  const titleEls = journeyPanelContent.querySelectorAll('.journey-unit-title');
  titleEls.forEach(el => {
    el.addEventListener('click', () => {
      const clickedIdx = el.getAttribute('data-target-index');
      const unitElement = document.querySelector(`.interactive-unit[data-index="${clickedIdx}"]`);
      if (unitElement) {
        // Highlight Multiple Choice
        highlightUnitMulti(unitElement, el, clickedIdx);

        centerElementOnUnit(unitElement);
      }
    });
  });
}


function clearHighlight() {
  if (currentlyHighlightedUnitElement) {
    currentlyHighlightedUnitElement.classList.remove('highlighted-unit');
    currentlyHighlightedUnitElement = null;
  }
  if (currentlyHighlightedTitleElement) {
    currentlyHighlightedTitleElement.classList.remove('highlighted-title');
    currentlyHighlightedTitleElement = null;
  }
}

function highlightUnit(unitElement, titleElement) {
  unitElement.classList.add('highlighted-unit');
  titleElement.classList.add('highlighted-title');

  currentlyHighlightedUnitElement = unitElement;
  currentlyHighlightedTitleElement = titleElement;
}

function highlightUnitMulti(unitElement, titleElement, unitIndex) {
  // If the unit has already been assigned a colour, it is straightforward to use the
  let color = highlightColorMap[unitIndex];
  if (!color) {
    color = getNextColor();
    highlightColorMap[unitIndex] = color; 
  }

  // For canvas unit styles
  unitElement.style.outline = `3px solid ${color}`;
  unitElement.style.boxShadow = `0 0 10px ${color}`;

  // For Journey title
  titleElement.style.color = color;
}

function centerElementOnUnit(unitElement) {
  if (!unitElement) return;
  
  // 1) Get canvas container root
  const container = document.getElementById('root');
  if (!container) return;

  // 2) Get the current transform of the canvas.
  const matrix = new DOMMatrix(getComputedStyle(container).transform);

  // 3) Calculates the current position of the unitElement in the visual area.
  const rect = unitElement.getBoundingClientRect();

  // Screen centre coordinates
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // Centre point of the module
  const elementCenterX = rect.left + rect.width / 2;
  const elementCenterY = rect.top + rect.height / 2;

  const dx = centerX - elementCenterX;
  const dy = centerY - elementCenterY;

  container.style.transition = 'transform 0.5s ease';

  matrix.e += dx;
  matrix.f += dy;

  container.style.transform = matrix.toString();
}

// Get the next colour as required
function getNextColor() {
  const color = colorPalette[colorIndex % colorPalette.length];
  colorIndex++;
  return color;
}

// Clear all highlights
function clearAllHighlights() {
  Object.keys(highlightColorMap).forEach(unitIdx => {
    const unitEl = document.querySelector(`.interactive-unit[data-index="${unitIdx}"]`);
    if (unitEl) {
      unitEl.style.outline = "";
      unitEl.style.boxShadow = "";
    }
  });

  const journeyPanel = document.getElementById('journeyPanelContent');
  if (journeyPanel) {
    // Find all elements with data-target-index and restore the colours
    journeyPanel.querySelectorAll("[data-target-index]").forEach(el => {
      el.style.color = "";
    });
  }

  for (const key in highlightColorMap) {
    delete highlightColorMap[key];
  }
}


/* ------------------------------
   Function that detects whether the root cell is in the visible area or not
------------------------------ */
// Returns true if any part of the viewport is in the viewport, false if not at all.
function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();

  // As long as there is any intersection, it is considered to be in the visible range
  const inHorizontally = (rect.left < window.innerWidth && rect.right > 0);
  const inVertically   = (rect.top < window.innerHeight && rect.bottom > 0);
  
  // If both horizontal and vertical crossings are present, the element is partially visible
  return inHorizontally && inVertically;
}

function updateFloatingRootprompt() {
  // 1) Get root unit
  const rootUnit = document.querySelector('.interactive-unit[data-index=""]');
  if (!rootUnit) return; // If it doesn't exist, just don't do anything
  
  // 2) Get the text of the input box of the root cell
  const rootInput = rootUnit.querySelector('input[type="text"]');
  if (!rootInput) return;
  const userText = rootInput.value.trim();

  // 3) If the root cell input is empty => hide the floating container immediately.
  if (!userText) {
    document.getElementById('floating-rootprompt').style.display = 'none';
    return;
  }

  // ------------------------------
  //  Check the visibility of the rootInput
  // ------------------------------
  const isVisible = isElementInViewport(rootInput);
  
  // Show or hide floating containers depending on whether they are visible => Show or hide floating containers
  const floatingBox = document.getElementById('floating-rootprompt');
  const floatingText = document.getElementById('rootprompt-text');
  
  if (!isVisible) {
    // Input box completely runs out of viewport => show floating hints
    floatingText.textContent = userText;  
    floatingBox.style.display = 'block';
  } else {
    // Input box as long as part of it is inside the viewport => hide floating hints
    floatingBox.style.display = 'none';
  }
}

function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  const inHorizontally = (rect.left < window.innerWidth && rect.right > 0);
  const inVertically   = (rect.top < window.innerHeight && rect.bottom > 0);
  return inHorizontally && inVertically;
}

/* ------------------------------
   generateImage: ...
------------------------------ */
async function generateImage(unitIndex, unitElement) {
  const history = conversationMap[unitIndex];
  if (!history || !history.length) {
    alert("No suitable assistant message found to generate an image");
    return;
  }
  const lastAssistant = [...history].reverse().find(msg => msg.role === 'assistant');
  if (!lastAssistant) {
    alert("No available prompt to generate an image");
    return;
  }

  const promptForImage = lastAssistant.content || "A blank message";

  const imgContainer = unitElement.querySelector('.image-container');
  let loadingDiv = document.createElement('div');
  loadingDiv.classList.add('loading-spinner');
  loadingDiv.innerHTML = `<img src="/static/loading.gif" alt="Loading...">`;
  if (imgContainer) {
    imgContainer.appendChild(loadingDiv);
  }

  try {
    const res = await fetch('/generate_image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptForImage })
    });
    const data = await res.json();
    if (data.error) {
      alert("Error generating image: " + data.error);
      return;
    }
    const imageUrl = data.url;
    if (imgContainer) {
      imgContainer.innerHTML = `<img src="${imageUrl}" alt="Generated Image" style="max-width:200px;border:1px solid #ccc;">`;
    }
  } catch (error) {
    console.error("Image generation error:", error);
    alert("Error calling the image generation API");
  } finally {
    if (loadingDiv && imgContainer.contains(loadingDiv)) {
      imgContainer.removeChild(loadingDiv);
    }
  }
}


/* ------------------------------
   centerElement: Centres the newly generated container
------------------------------ */
function centerElement(element) {
  if (shouldAnimate) {
    const container = document.getElementById('root');
    const rect = element.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(container).transform);

    const deltaX = (window.innerWidth / 2) - (rect.left + rect.width / 2);
    const deltaY = (window.innerHeight / 2) - (rect.top + rect.height / 2);

    container.style.transition = 'transform 0.5s ease';
    matrix.e += deltaX;
    matrix.f += deltaY;
    container.style.transform = matrix.toString();
  }
}

//Loading vision
/**
 * Insert a <img> into the container，display loading.gif
 * @param {HTMLElement} container - 
 */
function showLoading(container) {
  if (!container) return;
  // To avoid duplicate insertions, first check that there are no
  let existing = container.querySelector('.loading-indicator');
  if (!existing) {
    const img = document.createElement('img');
    img.src = "/static/loading.gif"; 
    img.alt = "Loading...";
    img.className = "loading-indicator";

    container.appendChild(img);
  }
}

/**
 * Remove loading <img> in container
 * @param {HTMLElement} container
 */
function hideLoading(container) {
  if (!container) return;
  let existing = container.querySelector('.loading-indicator');
  if (existing) {
    existing.remove();
  }
}
