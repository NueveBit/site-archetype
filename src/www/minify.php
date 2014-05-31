<?php

ini_set("error_reporting", 0);

if ((isset($_GET["f"]) && $_GET["f"]) &&
        (isset($_GET["t"]) && $_GET["t"])) {

    define('DIR_BASE', dirname($_SERVER['SCRIPT_FILENAME']));
    define('DIR_PACKAGES', DIR_BASE . '/packages');
    define('DIR_LIBRARIES', DIR_BASE . '/libraries');
    define('DIR_FILES_CACHE', DIR_BASE . '/files/cache');
    define('DIRNAME_JAVASCRIPT', 'js');
    define('DIRNAME_PACKAGES', 'packages');
    define('DIRNAME_BLOCKS', 'blocks');
    define('DIR_BASE_CORE', dirname(__FILE__) . '/concrete');
    define('DIRNAME_CSS', 'css');
    define('DIR_FILES_THEMES', DIR_BASE . '/themes');
    define('DIR_FILES_THEMES_CORE', DIR_BASE_CORE . '/themes');
    define('DIR_FILES_THEMES_CORE_ADMIN', DIR_BASE_CORE . '/themes/core');

    require_once(DIR_BASE . '/config/site.php');

    $pos = stripos($_SERVER['SCRIPT_NAME'], MINIFY_SCRIPT);
    if ($pos > 0) { //we do this because in CLI circumstances (and some random ones) we would end up with index.ph instead of index.php
        $pos = $pos - 1;
    }
    $uri = substr($_SERVER['SCRIPT_NAME'], 0, $pos);
    define('DIR_REL', $uri);

    $path = DIR_PACKAGES . '/nuevebit';
    $libPath = $path . "/libraries";

    ini_set("include_path", get_include_path() . PATH_SEPARATOR . $libPath . PATH_SEPARATOR . $libPath . '/Minify' . PATH_SEPARATOR . '/lessphp');
    //require_once($libPath . '/Minify/Minify.php');
    require_once(DIR_LIBRARIES . "/vendor/autoload.php");
    //require_once($libPath . '/lessphp/lessc.php');
    //require_once($libPath . '/minify.php');
    // we need to add this directory to the include path, so we don't have to change
    // the references in code

    $files = explode(",", $_GET["f"]);
    $type = $_GET["t"];
    $view = (isset($_GET["v"]) && $_GET["v"]) ? $_GET["v"] : null;

    $minifier = new Minifier($files, $type, $view);
    $minifier->serve();
}

class Minifier {

    private $sources;
    private $packages;
    private $view;

    /**
     * 
     * @param array $files The files to be minified
     * @param char $type The type of the files to minify (css/javascript)
     * @param string $view The current template used by C5 
     */
    function __construct($files, $type, $view = null) {
        $this->sources = array();
        $this->packages = array();
        $this->view = str_replace("../", "", $view);

        foreach ($files as $file) {
            // security measures...
            $file = str_replace("../", "", $file);

            list($name, $pkg) = explode(";", $file);
            $this->packages[] = $pkg;

            $source = $this->getSource($type, $name, $pkg);
            if ($source) {
                $this->sources[] = $source;
            }
        }
    }

    function serve() {
        $options = array(
            'files' => $this->sources,
            'encodeMethod' => ''
        );

        list($prefix) = explode('/' . MINIFY_SCRIPT, DIR_REL, 2);
        if ($prefix) {
            $prefix = ltrim($prefix, "/");

            $symlinks = array();
            $symlinks["//" . $prefix] = DIR_BASE;
            $symlinks["//" . $prefix . "/concrete"] = DIR_BASE_CORE;

            $packages = array_unique($this->packages);

            // this makes OS symlinks work
            foreach ($packages as $package) {
                if ($package) {
                    $path = DIR_BASE . "/packages/" . $package;
//                $path = realpath($path);

                    $symlinks["//$prefix/packages/$package"] = $path;
                }
            }

            $options["minifierOptions"] = array(Minify::TYPE_CSS => array(
                    "symlinks" => $symlinks
            ));
        }

        Minify::setDocRoot(DIR_BASE);

        if (defined('MINIFY_CACHE_DISABLE') && MINIFY_CACHE_DISABLE) {
            Minify::setCache(null);
            $options['lastModifiedTime'] = 0;
        } else {
            Minify::setCache(DIR_FILES_CACHE);
        }

        Minify::serve("Files", $options);
    }

    private function getSource($type, $file, $pkgHandle) {
        if (substr($file, 0, 4) == 'http' || strpos($file, "index.php") > -1) {
            return null;
        }

        $path = null;
        $currentTheme = $this->view;

        if (substr($file, 0, 1) == '/') {

            // let's try to guess the path
            if (strpos($file, "packages/") !== false) {
                $path = substr($file, strpos($file, "packages/") + 9);

                if (file_exists(DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $path)) {
                    $path = DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $path;
                } else {
                    $path = DIR_BASE_CORE . '/' . DIRNAME_PACKAGES . '/' . $path;
                }
            } else if (strpos($file, "blocks/") !== false) {
                $path = substr($file, strpos($file, "blocks/") + 7);

                if (file_exists(DIR_BASE . '/' . DIRNAME_BLOCKS . '/' . $path)) {
                    $path = DIR_BASE . '/' . DIRNAME_BLOCKS . '/' . $path;
                } else {
                    $path = DIR_BASE_CORE . '/' . DIRNAME_BLOCKS . '/' . $path;
                }
            } else if (strpos($file, "/bower_components/") === 0 && file_exists(DIR_BASE . $file)) { // search in bower components
                $path = DIR_BASE . $file;
            }
        } else if (file_exists(DIR_BASE . '/' . $type . '/' . $file)) {
            $path = DIR_BASE . '/' . $type . '/' . $file;
        } else if ($pkgHandle != null) {
            if (file_exists(DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file)) {
                $path = DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file;
            } else if (file_exists(DIR_BASE_CORE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file)) {
                $path = DIR_BASE_CORE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file;
            }
        } else if ($currentTheme) {
            $currentThemeDirectory = DIR_FILES_THEMES . '/' . $currentTheme;

            if (file_exists($currentThemeDirectory . '/' . $file)) {
                $path = $currentThemeDirectory . '/' . $file;
            } else if ($pkgHandle != null) {
                if (file_exists(DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file)) {
                    $path = DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file;
                } else if (file_exists(DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/themes/' . $currentTheme . '/' . $file)) {
                    $path = DIR_BASE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/themes/' . $currentTheme . '/' . $file;
                } else if (file_exists(DIR_BASE_CORE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file)) {
                    $path = DIR_BASE_CORE . '/' . DIRNAME_PACKAGES . '/' . $pkgHandle . '/' . $type . '/' . $file;
                }
            }
        }

        if (!$path) {
            $path = DIR_BASE_CORE . '/' . $type . '/' . $file;
        }

        return $path;
    }

}

?>