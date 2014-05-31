<!DOCTYPE html> 
<!--[if lt IE 9]>      <html xmlns="http://www.w3.org/1999/xhtml" lang="<?= LANGUAGE ?>" class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if gt IE 8]><!--> 
<html xmlns="http://www.w3.org/1999/xhtml" lang="<?= LANGUAGE ?>" class="no-js" > 
    <!--<![endif]-->
    <head>
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
        <!--
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
        -->
        <link type="text/plain" rel="author" href="humans.txt" title="Developer Team" />

        <?php
        $assets = Loader::helper("html");

        // main.css is created by gulp
        $this->addHeaderItem($assets->css("main.css"));

        // Load stylesheets/scripts before calling Loader::packageElement()
        // Include Modernizr in the Header
        // NOTE: All paths are relative to js/ folder in src/www
        $this->addHeaderItem($assets->javascript("/bower_components/modernizr/modernizr.js"));

        Loader::element('header_required');
        ?>

    </head>

    <body>
        <!--[if lt IE 9]>
            <p class="chromeframe">You are using an outdated browser. <a href="http://browsehappy.com/">Upgrade your browser today</a> or <a href="http://www.google.com/chromeframe/?redirect=true">install Google Chrome Frame</a> to better experience this site.</p>
        <![endif]-->

        <!-- BEGIN SCRIPTS FOOTER -->
        <?php
        // Load scripts before calling Loader::packageElement()
        
        // main.js is created by gulp
        $this->addFooterItem($assets->javascript("main.js"));

        Loader::element('footer_required');
        ?>
        <!-- END SCRIPTS FOOTER -->
    </body>
</html>
