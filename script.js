// ==UserScript==
// @name         XPLAY.GG Store Enhance
// @version      2.1.0
// @description  Enhances the xplay.gg store with additional features!
// @author       Treasure
// @match        https://xplay.gg/*
// @icon         https://xplay.gg/static/favicons/favicon-96x96.png
// @grant        window.onurlchange
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      steamcommunity.com
// @updateURL    https://github.com/Tr345ure/xplay-store-enhance/raw/main/xplay-store-enhance.user.js
// @downloadURL  https://github.com/Tr345ure/xplay-store-enhance/raw/main/xplay-store-enhance.user.js
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Add event listeners for initial load of page and every page change afterwards
    window.addEventListener("load", siteLoadHandler, { once: true });
    window.addEventListener("newurl", siteLoadHandler);
    window.addEventListener("pagechange", siteLoadHandler);

    // Check for browser support of Tampermonkey's window.onurlchange
    // If compatible, use the native implementation. If not, go to fallback mode
    if (window.onurlchange === null) {
        window.addEventListener("urlchange", (event) => {
            window.dispatchEvent(new CustomEvent("newurl", {
                detail: {
                    url: event.url
                }
            }));
        });
    } else { // Use fallback mode: Check every 200ms if current URL is different from the last one
        console.info("XPLAY.GG Store Enhance:\nOnUrlChange is NOT supported, continuing in fallback mode");
        let oldURL = window.location.href;
        let newURL;
        setInterval(() => {
            newURL = window.location.href;
            if(newURL !== oldURL){
                window.dispatchEvent(new CustomEvent("newurl", {
                    detail: {
                        url: newURL
                    }
                }));
                oldURL = newURL;
            }
        }, 200);
    }

    // Make resolve and reject for the showcase search public
    let retryResolve, retryReject;

    const emptyShowcaseMsgs = ["Showcase is empty","Cellule vide","Zelle leer","A bemutató üres","Komórka pusta","Ячейка пуста","El escaparate está vacío"];

    // Add CSS for buttons and notifications
    GM_addStyle(
        ".xse_addon_button {" +
        "display: inline-block; padding: 0.5em 0.8em 0.5em 0.8em; margin: 1em 0.7em 0 0;" +
        "color: white; background-color: #282d32; border-radius: 1em; text-align: center;" +
        "}" +

        ".xse_addon_button a { color: white; text-decoration: none; }" +
        ".xse_addon_button:hover { cursor: pointer; color: #ddd; }" +
        ".xse_addon_button a:hover { cursor: pointer; color: #ddd; }" +
        ".xse_addon_priceTag { display: inline; }" +
        ".xse_addon_loadAll { color: white; position: fixed; bottom: 4em; right: 2em; }" +

        ".xse_addon_notifContainer {" +
        "position: absolute; bottom: 2em; right: 3.5em; background-color: #282d32;" +
        "border-radius: 0.5em; width: 30em; min-height: 6em" +
        "}" +

        ".xse_addon_notifTime {" +
        "position: absolute; top: 0; left: 0; width: 30em; height: 0.5em; border-radius: 5px 5px 5px 0;" +
        "}" +

        ".xse_addon_notifTitle { padding: 0; margin: 0.7em 0 0.3em 0.8em; font-size: 1.7em; color: white; }" +
        ".xse_addon_notifMessage { padding: 0 0 1em 0; margin: 0 0 0 1em; font-size: 1.4em; color: white; }"
    );

    // Check what part of the site we're currently on
    // Return "store" for store and auction pages, "inventory" for profile inventory page and "another" for the rest
    function checkForPageType(url){
        const storeURLRegex = new RegExp("https:\/\/xplay\.gg\/([a-z]{2}\/)?store");
        const inventoryURLRegex = new RegExp("https:\/\/xplay\.gg\/([a-z]{2}\/)?profile\/inventory");
        
        if (storeURLRegex.test(url)) return "store";
        if (inventoryURLRegex.test(url)) return "inventory";
        return "another";
    }

    // Handle the load and newurl events and extract the current URL from them
    // Call different functions depending on if it's a store page or not
    function siteLoadHandler(event){
        const loadDelay = 400;
        let currentUrl;
        switch(event.type){
            case "load":
                currentUrl = event.target.URL;
                break;
            case "newurl":
                currentUrl = event.detail.url;
                break;
            case "pagechange":
                retryReject("Page change event, stop retrying");
                currentUrl = event.detail.url;
                break;
            default:
                console.error("XPLAY.GG Store Enhance:\nUnknown event type was called in the site load handler");
        }

        switch(checkForPageType(currentUrl)){
            case "store":
                setTimeout(setButtonListeners, loadDelay); // Set onclick event listeners for all relevant buttons
                setTimeout(execute, loadDelay, getStoreElements, getStoreShowcaseClasses, getStoreFullShowcases);
                break;
            case "inventory":
                setTimeout(execute, loadDelay, getInventoryElements, getInventoryShowcaseClasses, getInventoryFullShowcases);
                break;
            default:
                setTimeout(removeLoadAllButton, loadDelay);
                break;
        }
    }


    // When a store/inventory page is found, get skins and add buttons to them
    function execute(getElementsFunc, getShowcaseClassesFunc, getFullShowcasesFunc){
        let elements;
        let showcaseClasses;

        // If only empty showcases have been found, retry for 5 seconds
        // or until showcases with skins have been found
        const showcasesPopulated = new Promise((resolve, reject) => {
            retryResolve = resolve;
            retryReject = reject;
            const retryDelay = 200;
            function retry(retries = 0){
                if(retries >= 25){
                    return reject("Maximum amount of retries reached");
                } else {
                    elements = getElementsFunc();
                    showcaseClasses = getShowcaseClassesFunc(elements);

                    if(showcaseClasses[0][1] === 0){
                        setTimeout(() => { retry(++retries) }, retryDelay);
                    } else {
                        return resolve("Skins found");
                    }
                }
            }
            retry();
        });

        // Once full showcases have been found:
        showcasesPopulated.then(() => {
            // Push all full showcases to an array
            let fullShowcases = getFullShowcasesFunc(elements, showcaseClasses[0][0]);
            // Get the item attributes for all skins from full showcases
            let itemAttributes = [];
            fullShowcases.forEach((element) => {
                itemAttributes.push(getItemAttributes(element));
            });
            // Change name color (i.e. for StatTrak) and add buttons
            itemAttributes.forEach((element) => {
                setNameColors(element);
                addShowcaseButtons(element);
            });
            // Add the "load all skin prices" button to the page
            addLoadAllButton(fullShowcases);
        }).catch(() => {
            // If the promise is rejected, do nothing.
            // The promise can be rejected for the following reasons:
            // 1) The requested page has been changed, no more retries needed
            // 2) The maximum amount of retries has been reached
            // 3) An unknown error occured during retrying.
        });
    }

    // Get all relevant DOM elements needed to extract the skin showcases
    function getStoreElements(){
        let elements = [];
        const elementAmountRequired = 16;

        try {
            // Get all elements that are skin showcases or at least pretend to be
            let elesStore = Array.from(document.getElementsByTagName("main")[0].children[0].children[2].children[0].children[3].children);
            let elesAuction = Array.from(document.getElementsByTagName("main")[0].children[0].children[2].children[0].children[4].children);

            // If not enough elements are in either element array, return an empty array, thus abort function
            if(elesStore.length < elementAmountRequired && elesAuction.length < elementAmountRequired){
                return [];
            }

            // Select which elements should be used depending on store or auction page
            if (elesStore.length > elesAuction.length) {
                elements = elesStore;
            } else {
                elements = elesAuction;
                // If it's an auction page, move auction timers up a bit
                moveAuctionTimers(elements);
            }

            return elements;
        } catch (error) {
            console.error("XPLAY.GG Store Enhance:\nError during store element collection", error);
        }
    }

    // Get all relevant DOM elements needed to extract the skin showcases
    function getInventoryElements(){
        const elementAmountRequired = 4;

        try {
            // Get all elements that are skin showcases or at least pretend to be
            let elements = Array.from(document.getElementsByTagName("main")[0].children[0].children[1].children[2].children[0].children[0].children[0].children[1].children[0].children);
            
            // If not enough elements in element array, abort function
            if (elements.length < elementAmountRequired) return [];
            
            return elements;
        } catch (error) {
            console.error("XPLAY.GG Store Enhance:\nError during inventory element collection", error);
        }
    }

    // Set event listeners for store navigation buttons that don't trigger a URL change
    function setButtonListeners(){
        try {
            // Get option button field, store/auction selector, pagination and skin search field
            let optionsButtons = document.getElementsByTagName("main")[0].children[0].children[2].children[0].children[2];
            let storeSelectionButtons = document.getElementsByTagName("main")[0].children[0].children[2].children[0].children[1].children[0];
            let paginationButtons = document.getElementsByTagName("main")[0].children[0].children[2].children[0].lastChild.children[1].children[0];
            let skinSearchField = document.getElementsByTagName("main")[0].children[0].children[2].children[0].children[2].children[1].children[0].children[1].children[1];

            // Specify handler for onclick/keydown events from the elements above
            // This is done so the event listeners can be removed on page change and not fire multiple events
            let buttonHandler = function(){
                [optionsButtons, storeSelectionButtons, paginationButtons].forEach((ele) => ele.removeEventListener("click", buttonHandler));
                skinSearchField.removeEventListener("keydown", buttonHandler);
                window.dispatchEvent(new CustomEvent("pagechange", {
                    detail: {
                        url: window.location.href
                    }
                }));
            };

            // Add EventListeners to option button field, store/auction selector, pagination and skin search field
            optionsButtons.addEventListener("click", buttonHandler);
            storeSelectionButtons.addEventListener("click", buttonHandler);
            paginationButtons.addEventListener("click", buttonHandler);
            skinSearchField.addEventListener("keydown", buttonHandler);
        } catch (error) {
            console.error("XPLAY.GG Store Enhance:\nError while setting click listeners for buttons", error);
        }
    }

    // Get class names of full, empty and other showcases because they are generated dynamically
    function getStoreShowcaseClasses(elements){
        const reliableShowcasesRequired = 20;

        // Arrays for collecting the amount and class names of full, empty and other (i.e. ads) showcases
        // [className, amountOfOccurences];
        let fullShowcases = ["", 0];
        let emptyShowcases = ["", 0];
        let otherShowcases = ["", 0];

        // Check how many showcases of which sort are there and determine their class names
        elements.forEach((ele) => {
            if(ele.children.length >= 6){
                fullShowcases[0] = ele.className;
                fullShowcases[1]++;
            } else if(emptyShowcaseMsgs.includes(ele.innerText)){
                emptyShowcases[0] = ele.className;
                emptyShowcases[1]++;
            } else {
                otherShowcases[0] = ele.className;
                otherShowcases[1]++;
            }
        })

        // If there are less than 20 elements that are full or empty showcases, return an empty array, thus abort function
        if(fullShowcases[1] + emptyShowcases[1] < reliableShowcasesRequired){
            return [["", 0],["", 0],["", 0]];
        }

        return [fullShowcases, emptyShowcases, otherShowcases];
    }

    // Get class names of full, empty because they are generated dynamically
    function getInventoryShowcaseClasses(elements){
        const reliableShowcasesRequired = 4;

        // Arrays for collecting the amount and class names of full, empty showcases
        // [className, amountOfOccurences];
        let fullShowcases = ["", 0];
        let emptyShowcases = ["", 0];

        // Check how many showcases of which sort are there and determine their class names
        elements.forEach((ele) => {
            if(ele.children[0].children.length >= 6){
                fullShowcases[0] = ele.className;
                fullShowcases[1]++;
            } else if(emptyShowcaseMsgs.includes(ele.innerText)){
                emptyShowcases[0] = ele.className;
                emptyShowcases[1]++;
            }
        })

        // If there are less than 4 elements that are full or empty showcases, return an empty array, thus abort function
        if(fullShowcases[1] + emptyShowcases[1] < reliableShowcasesRequired){
            return [["", 0],["", 0]];
        }

        return [fullShowcases, emptyShowcases];
    }

    // Return an array of the DOM elements of all full showcases
    function getStoreFullShowcases(elements, targetClass){
        let fullShowcases = [];
        elements.forEach((element) => {
            if(element.className === targetClass){
                fullShowcases.push(element);
            }
        })
        return fullShowcases;
    }

    // Return an array of the DOM elements of all full showcases
    function getInventoryFullShowcases(elements, targetClass){
        let fullShowcases = [];
        elements.forEach((element) => {
            if(element.className === targetClass){
                fullShowcases.push(element.children[0]);
            }
        })
        return fullShowcases;
    }

    // Get item attributes:
    // StatTrak status, Souvenir status, xcoin price, weapon type, skin name, condition
    function getItemAttributes(element){
        let statTrak = false;
        let souvenir = false;
        let price;

        const children = element.childNodes;
        const weaponTypeElement = children[1].firstChild;
        const weaponSkinElement = children[2];
        const weaponConditionElement = children[3];
        const xcoinPriceElement = children[1].lastChild;

        // Check if skin is StatTrak or Souvenir
        if(weaponTypeElement.innerText.includes("StatTrak")){
            statTrak = true;
        }
        if (weaponTypeElement.innerText.includes("Souvenir")){
            souvenir = true;
        }

        // Get xcoin price of the skin
        price = xcoinPriceElement.innerText;

        return buildItemAttrArray(
            element,
            statTrak,
            souvenir,
            price,
            weaponTypeElement.innerText,
            weaponSkinElement.innerText,
            weaponConditionElement.innerText
        );
    }

    // Build an array from raw item attributes
    function buildItemAttrArray(element, weaponSt, weaponSv, price, weaponType, weaponSkin, weaponCondition){
        let text = [];

        // Weapon type (i.e. "AK-47")
        text.push(weaponType);
        text.push(" | ");

        // Skin name (i.e. "Amber Fade"), remove phase descriptors
        let skinName = weaponSkin;
        // Remove second line (i.e. amount of bids for auctions)
        skinName = skinName.split("\n")[0];
        // Remove Phase descriptors (i.e. "Phase 2")
        const phaseRegex = /\sPhase\s\d$/;
        skinName = skinName.replace(phaseRegex,"");
        text.push(skinName);

        // Skin condition (i.e. "Field-Tested")
        text.push(" (");
        text.push(weaponCondition);
        text.push(")");

        // Encode search string, replace some special chars, and finally build marketplace URL
        //                                         TM sign for StatTrak          Star for special items             Single quote
        //                                                 v                              v                              v
        let returnText = encodeURI(text.join("")).replace("%u2122", "%e2%84%a2").replace("%u2605", "%e2%98%85").replace("'", "%27");

        return [element, weaponSt, weaponSv, Number(price), returnText];
    }

    // Determine the market tag for the rarity so search results can be filtered reliably
    function getMarketStTag(searchString, weaponSt, weaponSv){
        // Check if item is a special item (i.e. knives, gloves)
        const isKnife = searchString.toLowerCase().includes("%e2%98%85");

        if(weaponSv){
            // Souvenir
            return "tag_tournament";
        }

        if(weaponSt && isKnife){
            // StatTrak AND special item
            return "tag_unusual_strange";
        } else if (weaponSt && !isKnife) {
            // Just StatTrak
            return "tag_strange";
        } else if (!weaponSt && isKnife) {
            // Just special item
            return "tag_unusual";
        } else if (!weaponSt && !isKnife) {
            // Neither StatTrak nor special item
            return "tag_normal";
        } else {
            console.error("XPLAY.GG Store Enhance:\nCouldn't get skin status tag");
        }
    }

    // Add the "load all skin prices" button to the page
    function addLoadAllButton(elements){
        // Remove all previous buttons to prevent stale elements for clicks
        removeLoadAllButton();

        // Add button to page
        let checkAllButton = document.createElement("div");
        checkAllButton.className = "xse_addon_button xse_addon_loadAll";
        checkAllButton.innerHTML = "Load all<br>skin prices";
        document.body.appendChild(checkAllButton);

        // Add click event listener to the page that clicks all "load price" buttons it can find
        checkAllButton.addEventListener("click", function(){
            elements.forEach((element) => {
                if(element.lastChild.innerText === "Load Price") element.lastChild.click();
            })
            checkAllButton.remove();
        });
    }

    // Remove all "load all skin prices" buttons it can find from a page
    function removeLoadAllButton(){
        if(document.getElementsByClassName("xse_addon_loadAll").length > 0){
            Array.from(document.getElementsByClassName("xse_addon_loadAll")).forEach((element) => {
                element.remove();
            });
        }
    }

    // Add the "steam market" and "load price" to an element
    function addShowcaseButtons(elementAttributes){
        // Only add the buttons if the element doesn't have them yet
        if(elementAttributes[0].lastChild.className !== "xse_addon_button" &&
            elementAttributes[0].lastChild.className !== "xse_addon_priceTag") {
            // Change element height to auto to make space for the buttons
            elementAttributes[0].style.height = "auto";

            // Add "steam market" button
            let steamMarketButton = createSteamMarketButton(elementAttributes[4]);
            elementAttributes[0].appendChild(steamMarketButton);

            // Add "load price" button
            let loadPriceButton = createLoadPriceButton(
                elementAttributes[4],
                elementAttributes[3],
                elementAttributes[1],
                elementAttributes[2]
            );
            elementAttributes[0].appendChild(loadPriceButton);
        }
    }

    // Create the "steam market" button DOM element with the proper URL
    function createSteamMarketButton(searchString){
        let steamMarketUrl = "https://steamcommunity.com/market/listings/730/" + searchString;

        let button = document.createElement("div");
        button.className = "xse_addon_button";
        button.innerHTML = "<a href='" + steamMarketUrl + "' target='_blank'>Steam Market &#129133;</a>";
        button.addEventListener("click", (event) => { event.stopPropagation(); });

        return button;
    }

    // Create the "load price" button DOM element with the proper URL for API request
    // and add a click event listener to it to fire the XHR
    function createLoadPriceButton(searchString, price, weaponSt, weaponSv){
        let statTrakTag = getMarketStTag(searchString, weaponSt, weaponSv);
        // Build the XHR URL
        let requestUrl =
            "https://steamcommunity.com/market/search/render/?query=" +
            searchString +
            "&start=0&count=1&search_descriptions=0&sort_column=default&sort_dir=desc&appid=730" +
            "&category_730_ItemSet[]=any&category_730_ProPlayer[]=any&category_730_StickerCapsule[]=any" +
            "&category_730_TournamentTeam[]=any&category_730_Weapon[]=any&category_730_Quality[]=" +
            statTrakTag +
            "&norender=1";

        let button = document.createElement("div");
        button.className = "xse_addon_button";
        button.innerHTML = "Load Price";

        // Add a click event listener to the button to request the skin price
        // from Steam once the button is clicked
        button.addEventListener("click", function(event){
            event.stopPropagation();
            makeSteamRequest(requestUrl, price, button);
        });

        return button;
    }

    // Make the actual XHR to Steam and retry if necessary
    function makeSteamRequest(url, price, button, retries = 0){
        // Change the button to indicate that the price is loading
        button.innerText = "Loading...";
        button.style.backgroundColor = "transparent";

        // Fire the XHR
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function(response) {
                switch(response.status){
                    // Received "OK" status
                    case 200:
                        try {
                            let jsonResponse = JSON.parse(response.response);

                            // Retry if response is empty despite code 200
                            if(jsonResponse.total_count === 0 && retries < 3){
                                makeSteamRequest(url, price, button, retries++);
                                break;
                            }

                            // Once a price has been found, set the price tag
                            setPriceTag(button, price, jsonResponse.results[0].sell_price, jsonResponse.results[0].sell_price_text)
                        } catch(e) {
                            // Show notification if something went wrong
                            if(e.message === "jsonResponse.results[0] is undefined"){
                                createNotification(0, "Skin not found", "The skin you requested the price for could not be found on the community market.");
                            } else {
                                createNotification(0, "Error", "An error occured while trying to get the price of the requested skin.");
                                console.error("Error on line " + --e.lineNumber + ":\n" + e.message);
                            }
                        }
                        break;
                    // Received "Request Limit exceeded" status
                    case 429:
                        createNotification(0, "Rate limited", "Could not get data from Steam because you've been rate limited.");
                        break;
                    // Unexpected status code that's neither 200 or 429
                    default:
                        createNotification(0, "Unexpected Status Code", "The request to the Steam API failed with status code: " + response.status);
                }
            }
        });
    }

    // Set the price tag, format it and remove the "load price" button
    function setPriceTag(button, xcoinPrice, steamPrice, steamPriceText){
        let priceTag = document.createElement("div");
        let xcoinRatio = (steamPrice / xcoinPrice * 10).toFixed(2);
        priceTag.className = "xse_addon_priceTag";
        priceTag.innerHTML = steamPriceText;
        priceTag.innerHTML += " <small>(" + xcoinRatio + "&hairsp;/&hairsp;1k)</small>";
        button.parentNode.append(priceTag);
        button.remove();
    }

    // Change name color for StatTrak and Souvenir skins
    function setNameColors(element){
        const weaponTypeElement = element[0].children[1].firstChild;

        if(element[1]){
            weaponTypeElement.style.color = "orangered";
        }
        if(element[2]){
            weaponTypeElement.style.color = "gold";
        }
    }

    // Create a notification element with given type, title, message and duration
    function createNotification(type, title, message, duration = 4000){
        // Create elements needed for notification
        let notif = document.createElement("div");
        let notifTime = document.createElement("div");
        let notifTitle = document.createElement("h1");
        let notifMessage = document.createElement("p");

        // Set the displayed text according to supplied arguments
        notifTitle.innerText = title;
        notifMessage.innerText = message;

        // Set time bar color according to supplied argument
        let typeColor;
        if(type === 1){
            // Green
            typeColor = "#3d818f";
        } else {
            // Red
            typeColor = "#eb5757";
        }

        // Set styles for notification elements
        notif.className = "xse_addon_notifContainer";
        notifTime.className = "xse_addon_notifTime";
        notifTitle.className = "xse_addon_notifTitle";
        notifMessage.className = "xse_addon_notifMessage";
        notifTime.style.cssText = "background-color: " + typeColor + "; transition: width " + duration + "ms linear;";

        // Append notification to the page
        notif.appendChild(notifTime);
        notif.appendChild(notifTitle);
        notif.appendChild(notifMessage);
        document.body.appendChild(notif);

        // Animate time bar and remove notification after timeout
        setTimeout(()=>{ notifTime.style.width = "0px"; }, 10);
        setTimeout(()=>{ notif.remove(); }, duration+200);
    }

    // Move auction timers up because they are positioned relatively from the bottom of the showcase
    function moveAuctionTimers(elements){
        elements.forEach((ele) => {
            if(ele.children[5] !== undefined){
                ele.children[5].style = 'bottom: 5em;';
            }
        });
    }
})();