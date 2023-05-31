// ==UserScript==
// @name         XPLAY.GG Store Enhance
// @version      1.4.1
// @description  Enhances the xplay.gg store with additional features!
// @author       Treasure
// @match        https://xplay.gg/store
// @grant        GM_xmlhttpRequest
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
            eles = Array.from(document.getElementsByTagName('main')[0].children[0].children[3].children[0].children[1].children);
            // Condition, type, price, etc. selectors over the shop
            document.getElementsByTagName('main')[0].children[0].children[3].children[0].children[0].addEventListener("click", function(){ checkIfPageLoaded(300); });
            // Pagination under the shop
            document.getElementsByTagName('main')[0].children[0].children[3].children[0].children[2].children[1].children[0].addEventListener("click", function(){ checkIfPageLoaded(300); });
        } catch (e) {
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

        for(let i = 0; i < eles.length; i++){
            if(eles[i].class === lastClass){
                matchCounter++;
            }
            lastClass = eles[i].class;
        }

        if(matchCounter < 12){
            console.warn("--- XPLAY.GG Store Enhance ---\nLess matching elements than required have been found, aborting script execution.");
            return;
        }

        let itemCards = [];

        for(let i = 0; i < eles.length; i++){
            if(eles[i].class === lastClass){
                itemCards.push(eles[i]);
            }
        }

        for (let item of itemCards) {
            let children = item.childNodes;
            if(item.innerText === "Showcase is empty") continue;

            if(children.length <= 3){
                item.innerHTML = "<p style='text-align:center'>This ad was hidden by<br>XPLAY.GG Store Enhance</p>";
                item.style.borderBottom = "none";
                continue;
            }

            let text = "";
            text += children[1].firstChild.innerText + " | ";

            if(children[1].firstChild.innerText.includes("StatTrak")){
                item.setAttribute("st", true);
                children[1].firstChild.style.color = 'orangered';
            } else {
                item.setAttribute("st", false);
            }

            item.setAttribute("cost", children[1].lastChild.innerText);

            const phaseRegex = /\sPhase\s\d$/;
            if(phaseRegex.test(children[2].innerText)){
                text += children[2].innerText.replace(phaseRegex,"");
            } else {
                text += children[2].innerText;
            }

            text += " (" + children[3].innerText + ")";

            let searchString = encodeURI(text).replace('%20()%20(FOR%20PREMIUM)', '').replace('%u2122', '%e2%84%a2').replace('%u2605', '%e2%98%85');
            let url = 'https://steamcommunity.com/market/listings/730/' + searchString;
            if(url.length > 50 && item.lastChild.className !== 'xplay_steam_addon_link'){
                let button = document.createElement('div');
                button.className = 'xplay_steam_addon_link';
                button.innerHTML = '<a href="' + url + '" target="_blank">Check Steam Market</a>'
                button.style.cssText = 'display: inline-block; padding: 10px 15px 10px 15px; margin: 20px 10px 0 0; background-color: #282d32; border-radius: 20px; text-align: center;';
                item.style.height = 'auto';
                item.appendChild(button);
                button.firstChild.style.textDecoration = 'none';
                button.firstChild.style.color = 'white';

                let button2 = document.createElement('div');
                button2.className = 'xplay_steam_addon_link';
                button2.innerHTML = 'Load Price'
                button2.style.cssText = 'display: inline-block; padding: 10px 15px 10px 15px; margin-top: 20px; background-color: #282d32; border-radius: 20px; text-align: center;';
                item.style.height = 'auto';
                item.appendChild(button2);
                button2.addEventListener('click', function(button2){
                    let button = button2;
                    let stTag;
                    if(item.getAttribute("st") === "true"){
                        stTag = "tag_strange";
                    } else {
                        stTag = "tag_normal";
                    }
                    url = 'https://steamcommunity.com/market/search/render/?query=' + searchString + '&start=0&count=1&search_descriptions=0&sort_column=default&sort_dir=desc&appid=730&category_730_ItemSet[]=any&category_730_ProPlayer[]=any&category_730_StickerCapsule[]=any&category_730_TournamentTeam[]=any&category_730_Weapon[]=any&category_730_Quality[]=' + stTag + '&norender=1';

                    GM_xmlhttpRequest({
                        method: "GET",
                        url: url,
                        onload: function(response) {
                            try {
                                let jsonResponse = JSON.parse(response.response);
                                let priceTag = document.createElement('div');
                                priceTag.innerHTML = jsonResponse.results[0].sell_price_text;
                                let xcoinRatio = (jsonResponse.results[0].sell_price / item.getAttribute("cost") * 10).toFixed(2);
                                priceTag.innerHTML += " <small>(" + xcoinRatio + "&hairsp;/&hairsp;1k)</small>";
                                priceTag.style.display = 'inline';
                                button.target.parentNode.append(priceTag);
                                button.target.remove();
                            } catch(e) {
                                if(e.message === "jsonResponse.results[0] is undefined"){
                                    console.warn("The skin \"" + text + "\" could not be found on the Steam Community market");
                                } else {
                                    console.error("There was a problem while getting results from the Steam Community Market:\n", e.message);
                                }
                            }
                        }
                    });
                });
            }

        }
    }
})();
