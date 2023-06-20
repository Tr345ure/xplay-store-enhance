// ==UserScript==
// @name         XPLAY.GG Store Enhance
// @version      1.4.3
// @description  Enhances the xplay.gg store with additional features!
// @author       Treasure
// @match        https://xplay.gg/store
// @grant        GM_xmlhttpRequest
// @connect      steamcommunity.com
// @updateURL    https://github.com/Tr345ure/xplay-store-enhance/raw/main/script.js
// @downloadURL  https://github.com/Tr345ure/xplay-store-enhance/raw/main/script.js
// ==/UserScript==

(function() {
    'use strict';

    let retries = 0;
    checkIfPageLoaded(300);

    function checkIfPageLoaded(to){
        setTimeout(function() {
            if (document.readyState === "complete") {
                setTimeout(getElementsFromPage, to);
            } else {
                checkIfPageLoaded(300);
            }
        }, 100);
    }

    function getElementsFromPage(){
        let eles = [];
        try {
            // All elements that are skin showcases or at least pretend to be
            eles = Array.from(document.getElementsByTagName("main")[0].children[0].children[3].children[0].children[1].children);
            // Condition, type, price, etc. selectors over the shop
            document.getElementsByTagName("main")[0].children[0].children[3].children[0].children[0].addEventListener("click", function(){ checkIfPageLoaded(300); });
            // Pagination under the shop
            document.getElementsByTagName("main")[0].children[0].children[3].children[0].children[2].children[1].children[0].addEventListener("click", function(){ checkIfPageLoaded(300); });
        } catch (e) {
            // Try again if there are no elements yet
            if(retries < 50){
                retries++;
                checkIfPageLoaded(300);
            } else {
                console.warn("--- XPLAY.GG Store Enhance ---\nEither the page has taken too long to load or no skin showcases have been found. If the issue persists, please contact me: Treasure#4895");
                return;
            }
        }

        let matchCounter = 0;
        let lastClass = "";

        // Check how many elements with the same class there are
        for(let i = 0; i < eles.length; i++){
            if(eles[i].class === lastClass){
                matchCounter++;
            }
            lastClass = eles[i].class;
        }

        // If there are less than 12 elements with the same class, abort execution
        if(matchCounter < 12){
            console.warn("--- XPLAY.GG Store Enhance ---\nLess matching elements than required have been found, aborting script execution.");
            return;
        }

        let itemCards = [];

        // Fill the item card array with elements with the found class name
        for(let i = 0; i < eles.length; i++){
            if(eles[i].class === lastClass){
                itemCards.push(eles[i]);
            }
        }

        // Add buttons and their functionality to all skin showcases
        for (let item of itemCards) {
            let children = item.childNodes;
            // Ignore empty showcases
            if(item.innerText === "Showcase is empty") continue;
            // Replace showcases that are probably ads
            if(children.length <= 3){
                item.innerHTML = "<p style='text-align:center'>This ad was hidden by<br>XPLAY.GG Store Enhance</p>";
                item.style.borderBottom = "none";
                continue;
            }

            // Check if skin is StatTrak
            if(children[1].firstChild.innerText.includes("StatTrak")){
                item.setAttribute("st", true);
                children[1].firstChild.style.color = "orangered";
            } else {
                item.setAttribute("st", false);
            }

            // Get xcoin price of the skin
            item.setAttribute("cost", children[1].lastChild.innerText);

            // Begin assembling string with full skin name
            let text = "";
            // Weapon type (i.e. "AK-47")
            text += children[1].firstChild.innerText + " | ";
            // Skin name (i.e. "Amber Fade"), remove phase descriptors
            const phaseRegex = /\sPhase\s\d$/;
            if(phaseRegex.test(children[2].innerText)){
                text += children[2].innerText.replace(phaseRegex,"");
            } else {
                text += children[2].innerText;
            }
            // Skin condition (i.e. "Field-Tested")
            text += " (" + children[3].innerText + ")";

            // Remove premium tag and encode search string, replace some special chars, and finally build marketplace URL
            let searchString = encodeURI(text).replace("%20()%20(FOR%20PREMIUM)", "").replace("%u2122", "%e2%84%a2").replace("%u2605", "%e2%98%85");
            let url = "https://steamcommunity.com/market/listings/730/" + searchString;

            // If URL is properly built and there are no buttons yet...
            if(url.length > 50 && item.lastChild.className !== "xplay_steam_addon_link"){
                // Add "Check Steam Market" button
                let button = document.createElement("div");
                button.className = "xplay_steam_addon_link";
                button.innerHTML = "<a href='" + url + "' target='_blank'>Check Steam Market</a>";
                button.style.cssText = "display: inline-block; padding: 10px 15px 10px 15px; margin: 20px 10px 0 0; background-color: #282d32; border-radius: 20px; text-align: center;";
                item.style.height = "auto";
                item.appendChild(button);
                button.firstChild.style.textDecoration = "none";
                button.firstChild.style.color = "white";

                // Add "Load Price" button
                let button2 = document.createElement("div");
                button2.className = "xplay_steam_addon_link";
                button2.innerHTML = "Load Price";
                button2.style.cssText = "display: inline-block; padding: 10px 15px 10px 15px; margin-top: 20px; background-color: #282d32; border-radius: 20px; text-align: center;";
                item.style.height = "auto";
                item.appendChild(button2);

                // Make XHR to Steam when "Load Price" button is clicked
                button2.addEventListener("click", function(button2){
                    let button = button2;
                    let stTag;
                    // Get the StatTrak status of the skin
                    if(item.getAttribute("st") === "true"){
                        if(searchString.toLowerCase().includes("%e2%98%85")){
                            stTag = "tag_unusual_strange";
                        } else {
                            stTag = "tag_strange";
                        }
                    } else {
                        if(searchString.toLowerCase().includes("%e2%98%85")){
                            stTag = "tag_unusual";
                        } else {
                            stTag = "tag_normal";
                        }
                    }
                    // Build API request URL with search string from above, paying attention to StatTrak status
                    url = "https://steamcommunity.com/market/search/render/?query=" + searchString + "&start=0&count=1&search_descriptions=0&sort_column=default&sort_dir=desc&appid=730&category_730_ItemSet[]=any&category_730_ProPlayer[]=any&category_730_StickerCapsule[]=any&category_730_TournamentTeam[]=any&category_730_Weapon[]=any&category_730_Quality[]=" + stTag + "&norender=1";

                    // Send request to Steam
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: url,
                        onload: function(response) {
                            // Get and display result from Steam
                            try {
                                let jsonResponse = JSON.parse(response.response);
                                let priceTag = document.createElement("div");
                                priceTag.innerHTML = jsonResponse.results[0].sell_price_text;
                                let xcoinRatio = (jsonResponse.results[0].sell_price / item.getAttribute("cost") * 10).toFixed(2);
                                priceTag.innerHTML += " <small>(" + xcoinRatio + "&hairsp;/&hairsp;1k)</small>";
                                priceTag.style.display = "inline";
                                button.target.parentNode.append(priceTag);
                                button.target.remove();
                                // Show notification if something went wrong
                            } catch(e) {
                                if(e.message === "jsonResponse.results[0] is undefined"){
                                    createNotification(0, "Skin not found", "The skin you requested the price for could not be found on the community market.");
                                } else {
                                    createNotification(0, "Error", "An error occured while trying to get the price of the requested skin.");
                                    console.error("Error on line " + --e.lineNumber + ":\n" + e.message);
                                }
                            }
                        }
                    });
                });
            }

        }
    }

    function createNotification(type, title, message){
        // Display duration of the notification in ms
        const duration = 4000;

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
            typeColor = "#3d818f";
        } else {
            typeColor = "#eb5757";
        }

        // Set styles for notification elements
        notif.style.cssText = "position: absolute; bottom: 20px; right: 35px; background-color: #282d32; border-radius: 5px; width: 300px; min-height: 60px;";
        notifTime.style.cssText = "position: absolute; top: 0; left: 0; width: 300px; height: 5px; background-color: " + typeColor + "; border-radius: 5px 5px 5px 0; transition: width " + duration + "ms linear;";
        notifTitle.style.cssText = "padding: 0; margin: 10px 0 3px 10px; font-size: 22px; color: white;";
        notifMessage.style.cssText = "padding: 0 0 10px 0; margin: 0 0 0 10px; font-size: 14px; color: white;";

        // Append notification to the page
        notif.appendChild(notifTime);
        notif.appendChild(notifTitle);
        notif.appendChild(notifMessage);
        document.body.appendChild(notif);

        // Animate time bar and remove notification after timeout
        setTimeout(function(){ notifTime.style.width = "0px"; } , 10);
        setTimeout(function(){ notif.remove(); } , duration+200);
    }
})();