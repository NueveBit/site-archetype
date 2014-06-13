<?php

// la configuración de la DB debe estar en un archivo separado
$db = json_decode(file_get_contents(dirname(__FILE__) . "/db.json"));
define('DB_SERVER', $db->host);
define('DB_USERNAME', $db->user);
define('DB_PASSWORD', $db->password);
define('DB_DATABASE', $db->name);

// custom config
define('PERMISSIONS_MODEL', 'advanced');
define('APP_TIMEZONE', 'America/Mexico_City');
setlocale(LC_ALL, 'es_MX.UTF-8');
setlocale(LC_NUMERIC, 'en_US');

// MINIFIER CONFIGURATION
define('MINIFY_ENABLE', <%- enable_minify %>);
define('MINIFY_CACHE_DISABLE', FALSE);
define('MINIFY_SCRIPT', 'minify.php');

// FORM BLOCK CONFIG
define('FORM_BLOCK_SENDER_EMAIL', 'soporte@nuevebit.com');