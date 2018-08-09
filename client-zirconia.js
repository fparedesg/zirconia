/* CONSTANTS */
const TABLESS_WIDTH = (234 + 182) / 2;
const MAXIMUM_TAB_WIDTH = 190;
const MILLISECONDS_PER_UPDATE = 10;

/* GLOBAL VARIABLES FROM BACKGROUND.JS */
let tabScreenshots = {};
let tabOrder = [];

/* GLOBAL INTERNAL VARIABLES */
let singleTabWidth = -1;
let currentTabId = null;

/* DOM HANDLES */
let zirconiaRectangle;
let zirconiaHoverPane;
let zirconiaHoverPaneImg;

/* ON INITIALIZATION */
$(document).ready(function() {
    chrome.storage.sync.get(["updateRate", "tabBarVisibility", "tabBarHeight", "tabPreviewRatio"], function(data) {

        // Create a hidden pane that will contain the image preview.
        zirconiaHoverPaneImg = $("<img>")
            .attr("id", "zirconia-hover-pane-img")
            .css({
                width: "100%",
                height: "100%",
                borderRadius: "6px"
            });
        zirconiaHoverPane = $("<div>")
            .attr("id", "zirconia-hover-pane")
            .css({
                position: "fixed",
                width: data.tabPreviewRatio * window.outerWidth,
                height: data.tabPreviewRatio * window.outerHeight,
                background: "rgb(208, 208, 208)",
                top: data.tabBarHeight,
                left: 0,
                transition: "all 300ms",
                border: "3px outset rgb(208, 208, 208)",
                borderRadius: "6px",
                zIndex: 999999
            })
            .append(zirconiaHoverPaneImg)
            .hide();
        // Create an absolutely positioned pinkish rectangle and put it on the top of the screen.
        zirconiaRectangle = $("<div>")
            .attr("id", "zirconia-rectangle")
            .css({
                position: "fixed",
                height: data.tabBarHeight,
                width: window.outerWidth,
                background: data.tabBarVisibility == "tab-bar-visibility-yes" ? "rgba(255, 0, 0, 0.1)" : "rgba(0, 0, 0, 0)",
                top: 0,
                left: 0,
                zIndex: 999999
            })
            // When we move over the rectangle, determine which tab we're hovering over and update the global.
            .mousemove(function(event) {
                const tabStripWidth = zirconiaRectangle.width() - TABLESS_WIDTH;
                singleTabWidth = Math.min(tabStripWidth / tabOrder.length, MAXIMUM_TAB_WIDTH);
                currentTabId = Math.min(parseInt(event.originalEvent.offsetX / singleTabWidth), tabOrder.length - 1);
                // Update screenshot if we're not in automatic update mode.
                if(data.updateRate == "update-rate-on-tab-switch") {
                    UpdateTabsFromStorage();
                }
            })
            // When we enter the rectangle, show the preview pane.
            .mouseenter(function(event) {
                // Make sure it didn't detect a mouse event because the page was loading.
                if(!(event.clientX == 0 && event.clientY == 0)) {
                    zirconiaHoverPane.show();
                }
            })
            // When we exit the rectangle, hide the preview pane and make sure we explicitly unset the tab we were hovering over.
            .mouseout(function(event) {
                zirconiaHoverPane.hide();
                currentTabId = -1;
            })
            // Switch over to the clicked tab.
            .click(function(event) {
                chrome.runtime.sendMessage(currentTabId, function(response) { });
            });
        $("body").append(zirconiaRectangle);
        $("body").append(zirconiaHoverPane);

        // Update tab widths on window resizes.
        $(window).resize(function() {
            zirconiaRectangle.css({ width: window.outerWidth });
            zirconiaHoverPane.css({
                width: data.tabPreviewRatio * window.outerWidth,
                height: data.tabPreviewRatio * window.outerHeight
            });
        });

        // Every `MILLISECONDS_PER_UPDATE` milliseconds, pull all screenshots from local storage and refresh the current image, as long as we're not currently in the process of doing so.
        if(data.updateRate == "update-rate-continuous") {
            let lock = false;
            setInterval(function() {
                // Update screenshots only if we're hovering over the rectangle.
                if(!lock && currentTabId != -1) {
                    lock = true;
                    UpdateTabsFromStorage(function() {
                        lock = false;
                    });
                }
            }, MILLISECONDS_PER_UPDATE);
        }
        
        function UpdateTabsFromStorage(callback) {
            // Set `currentTabId` if it's never been set.
            if(currentTabId == null) currentTabId = -1;

            // Position the preview panel below the hovered tab.
            let tabPreviewPosition = Math.max((currentTabId * singleTabWidth) - (data.tabPreviewRatio * zirconiaRectangle.width() / 2) + (singleTabWidth / 2), 0);
            zirconiaHoverPane.css({ left: tabPreviewPosition });

            // Update the preview panel picture accordingly
            chrome.storage.local.get(["tabScreenshots", "tabOrder"], function(data) {
                tabScreenshots = data.tabScreenshots;
                tabOrder = data.tabOrder;
                zirconiaHoverPaneImg.attr("src", tabScreenshots[tabOrder[currentTabId]] || null);
                if(callback) callback();
            });
        }

        // Manually call UpdateTabsFromStorage once to get the array of tabs.
        UpdateTabsFromStorage();

    });
});
