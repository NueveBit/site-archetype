<?php

defined('C5_EXECUTE') or die(_("Access Denied."));

class SitePackage extends Package {

    protected $pkgHandle = 'site';
    protected $appVersionRequired = '5.6.0';
    protected $pkgVersion = '0.1';

    public function getPackageName() {
        return t("Website Package");
    }

    public function getPackageDescription() {
        return t("Nuevebit Website Package");
    }

    public function upgrade() {
        parent::upgrade();
    }

    public function install() {
        $pkg = parent::install();

        $this->installTheme();
    }

    private function installTheme() {
        // install theme
        PageTheme::add('site');
    }

    public function uninstall() {
        parent::uninstall();
    }

}
