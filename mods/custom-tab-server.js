jf.onStart(function() {
    jf.log.info('Custom Synthetic Tabs mod started.');
});

jf.onStop(function() {
    jf.log.info('Custom Synthetic Tabs mod stopped.');
});

jf.routes.get('/page.html', function(req, res) {
    var htmlContent = jf.vars['CUSTOM_HTML'];
    
    if (!htmlContent) {
        htmlContent = '<html><body style="color:white; font-family:sans-serif;">No content configured in JellyFrame vars.</body></html>';
    }
    
    return res.html(htmlContent);
});
