// Fills every manual AdSense unit on the page once the AdSense loader is present.
(function(){
  var units=document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
  for(var i=0;i<units.length;i++){try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}}
})();
