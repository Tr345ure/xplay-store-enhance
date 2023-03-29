// ==UserScript==
// @name         XPLAY.GG Store Enhance
// @version      1.3.0
// @description  Enhances the xplay.gg store with additional features!
// @author       Treasure
// @match        https://xplay.gg/store
// @grant        GM_xmlhttpRequest
// @updateURL    https://github.com/Tr345ure/xplay-store-enhance/raw/main/script.js
// @downloadURL  https://github.com/Tr345ure/xplay-store-enhance/raw/main/script.js
// ==/UserScript==

(function() {
    'use strict';

    checkIfPageLoaded(1500);

    function checkIfPageLoaded(to){
        setTimeout(function() {
            if (document.readyState === "complete") {
                setTimeout(getElementsFromPage, to);
            } else {
                checkIfPageLoaded(1500);
            }
        }, 100);
    }

    function getElementsFromPage(){
        let eles = document.getElementsByTagName('div');
        let itemCards = new Array();
        for (let item of eles) {
            if (item.className.includes("Card__Container") && (item.parentNode.className.includes("Rewards__List")) ) itemCards.push(item);
            if (item.className.includes("Pagination__Container")) item.addEventListener("click", function(){ checkIfPageLoaded(250); });
            if (item.className.includes("Rewards__ControlsContainer")) item.addEventListener("click", function(){ checkIfPageLoaded(250); });
        }

        for (let item of itemCards) {
            let children = item.childNodes;
            let text = "";
            for (let child of children) {
                if(child.className.includes("Card__TitleContainer")){
                    text += child.firstChild.innerText + " | ";
                    if(child.firstChild.innerText.includes("StatTrak")){
                        item.setAttribute("st", true);
                        child.firstChild.style.color = 'orangered';
                    } else {
                        item.setAttribute("st", false);
                    }
                }
                if(child.className.includes("Card__Name")){
                    text += child.innerText;
                }
                if(child.className.includes("Card__Type")){
                    text += " (" + child.innerText + ")";
                }
            }

            let searchString = encodeURI(text).replace('%20()%20(FOR%20PREMIUM)', '').replace('%u2122', '%e2%84%a2').replace('%u2605', '%e2%98%85');
            let url = 'https://steamcommunity.com/market/listings/730/' + searchString;
            if(url.length > 50 && item.lastChild.className != 'xplay_steam_addon_link'){
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
                    let stTag = "";
                    if(item.getAttribute("st") == "true"){
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
                                console.log(jsonResponse);
                                let priceTag = document.createElement('div');
                                priceTag.innerText = jsonResponse.results[0].sell_price_text;
                                priceTag.style.display = 'inline';
                                button.target.parentNode.append(priceTag);
                                button.target.remove();
                            } catch(e) {
                                console.log('Error: ', e);
                            }
                        }
                    });
                });
            }

        }
    }
})();
