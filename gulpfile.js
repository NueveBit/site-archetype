/**
 * @author emerino
 * 
 * Tareas para un website package.
 * 
 * Todas las tareas que aquí se definen son cross-platform, lo que quiere
 * decir que pueden ejecutarse en cualquier Sistema Operativo. 
 * 
 */

// sys deps
var fs = require('node-fs'); // mkdir recursive
var argv = require("yargs").argv; // cmd arguments support
var path = require('path');
var _ = require("underscore");
var exec = require('child_process').exec;
var spawn = require("child_process").spawn;
var read = require('read');
var Q = require('q');
var http = require("http");
var merge = require('merge-stream');

// gulp plugins
var gulp = require("gulp");
var util = require("gulp-util");
var clean = require('gulp-clean');
var rename = require("gulp-rename");
var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var less = require('gulp-less');
var minifycss = require("gulp-minify-css");
var template = require('gulp-template');
var zip = require('gulp-zip');

// local config
var config = {
    startingPoint: (argv.startingPoint)
            ? argv.startingPoint
            : "nuevebit_std",
    srcDir: path.join(__dirname, "src"),
    distDir: path.join(__dirname, "dist"),
    getJsFiles: function() {
        return JSON.parse(fs.readFileSync("src/www/themes/site/js/scripts.json"));
    }
};

// un servidor express con livereload para que inyecte los cambios directamente
// al navegador, sin utilizar plugins extras
var server = {
    port: 4000,
    livereloadPort: 35729,
    basePath: path.join(config.srcDir, "www"),
    _lr: null,
    start: function(cb) {
        var options = {
            port: this.port,
            hostname: '0.0.0.0',
            base: this.basePath,
            keepalive: true,
            open: false,
            bin: 'php'
        };

        var host = options.hostname + ':' + options.port;
        var args = ['-S', host];

        var cp = spawn(options.bin, args, {
            cwd: path.resolve(options.base),
            stdio: 'inherit'
        });

        if (cb) {
            cb();
        }
    },
    livereload: function() {
        this._lr = require('tiny-lr')();
        this._lr.listen(this.livereloadPort);
    },
    livestart: function() {
        this.start();
        this.livereload();
    },
    get: function(path, cb) {
        http.get(path, cb);
    },
    notify: function(event) {
        var fileName = path.relative(this.basePath, event.path);

        this._lr.changed({
            body: {
                files: [fileName]
            }
        });
    }
};

var db = JSON.parse(fs.readFileSync("src/config/db.json"));
var site = JSON.parse(fs.readFileSync("site.json"));

/**
 * Install tasks
 */
gulp.task("install:db", function(cb) {
    var adminUser = (argv.user) ? argv.user : "root";
    read({prompt: "MySQL " + adminUser + " password : ", silent: true}, function(er, adminPass) {
        console.log("Installing database");

        var createDatabase = Q.nfcall(exec, "mysqladmin" +
                " -u " + adminUser +
                " -p" + adminPass +
                " -h localhost" +
                " create " + db.name);

        var createUser = Q.nfcall(exec, "mysql" +
                " -u " + adminUser +
                " -p" + adminPass +
                " -h " + db.host +
                " -e \"CREATE USER '" + db.user + "'@'" + db.host + "' IDENTIFIED BY '" + db.password + "'\"");

        var grantPrivileges = Q.nfcall(exec, "mysql" +
                " -u " + adminUser +
                " -p" + adminPass +
                " -h " + db.host +
                " -e \"GRANT ALL PRIVILEGES ON " + db.name + ".* TO '" + db.user + "'@'" + db.host + "'\"");

        createDatabase
                .then(createUser)
                .then(grantPrivileges)
                .done();
    });

});

gulp.task("install:concrete5", ["copy:concrete5-sp"], function(cb) {
    console.log("Datos cuenta Concrete5");

    var installer = "src/www/libraries/vendor/concrete5/concrete5-cli/install-concrete5.php";

    read({prompt: "Correo electrónico: "}, function(err, email) {
        read({prompt: "Contraseña: ", silent: true}, function(err, pass) {
            var target = path.join(config.srcDir, "www");
            console.log("Installing concrete5 to: " + target);

            var options = [
                "db-server=" + db.host,
                "db-username=" + db.user,
                "db-password=" + db.password,
                "db-database=" + db.name,
                "admin-password=" + pass,
                "admin-email=" + email,
                "starting-point=" + config.startingPoint,
                "site=" + site.name + "'",
                "target='" + target + "'",
                "demo-username=''"
            ];

            if (argv.reinstall) {
                options.push("reinstall=" + argv.reinstall);
            }

            var process = spawn(installer, options);

            process.stdout.on("data", function(data) {
                var str = data.toString();
                var lines = str.split(/(\r?\n)/g);

                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        console.log(lines[i]);
                    }
                }
            });

            process.stderr.on("data", function(data) {
                console.log(JSON.stringify(data));
            });

            process.on("exit", function() {
                gulp.start("install:concrete5-packages");
            });
        });
    });
});

gulp.task("install:concrete5-packages", ["build:config-dev"], function(cb) {
    var packageInstaller
            = "src/www/libraries/vendor/concrete5/concrete5-cli/install-concrete5-package.php";

    var process = spawn(packageInstaller, [
        "c5-nuevebit",
        "target='" + server.basePath + "'"
    ], {stdio: "inherit"});

    process.on("exit", function() {
        var p = spawn(packageInstaller, [
            "site",
            "target='" + server.basePath + "'"
        ], {stdio: "inherit"});

        p.on("exit", function() {
            cb();
        });
    });
});

gulp.task("install", ["install:db"], function() {
    gulp.start("install:concrete5");
});

/**
 * Clean tasks 
 */
gulp.task("clean", function() {
    return gulp.src("dist").pipe(clean());
});

gulp.task("clean:dev", function() {
    return gulp.src([
        "src/www/css/main.css",
        "src/www/js/main.js"
    ]).pipe(clean());
});

gulp.task("clean:bower", function() {
    return gulp.src(["src/www/bower_components"])
            .pipe(clean());
});

gulp.task("clean:all", ["clean", "clean:dev", "clean:bower"], function() {
});

/**
 * Copy tasks
 */
gulp.task("copy:config", function() {
    return gulp.src(["**", "!site.php.tpl"], {
        cwd: "src/config/"
    })
            .pipe(gulp.dest("src/www/config"));
});

gulp.task("copy:controller", function() {
    gulp.src("src/controller.php").pipe(gulp.dest("src/www/packages/site/"));
});

gulp.task("copy:concrete5-sp", function() {
    var startingPointDir = "src/www/concrete/config/install/packages/";

    if (!fs.existsSync(startingPointDir)) {
        fs.mkdirSync(startingPointDir, 0777, true);
    }

    gulp.src("**", {cwd: "src/www/libraries/vendor/nuevebit/c5-starting-points/" + config.startingPoint})
            .pipe(gulp.dest(path.join(startingPointDir, config.startingPoint)));
});


/**
 * Build tasks
 */
gulp.task("build:scripts", function() {
    var scripts = [];
    _.each(config.getJsFiles(), function(src) {
        scripts.push("src/www/themes/site/js/" + src);
    });

    gulp.src(scripts)
            .pipe(concat("main.js"))
            //.pipe(uglify())
            .pipe(gulp.dest("src/www/js"));
});

gulp.task("build:less", function() {
    var source = path.join(config.srcDir, "www/themes/site/less/main.less");
    return gulp.src(source)
            .pipe(less({
                rootpath: "../themes/site/less/"
            }).on("error", util.log))
            .pipe(rename("main.css"))
            .pipe(gulp.dest("src/www/css"));
});

gulp.task("build:minify", ["build:less", "build:scripts"], function() {
    gulp.src(path.join(config.srcDir, "www/css/main.css"))
            .pipe(minifycss())
            .pipe(gulp.dest("dist/www/css"));

    gulp.src(path.join(config.srcDir, "www/js/main.js"))
            .pipe(uglify())
            .pipe(gulp.dest("dist/www/js"));
});

/**
 * Build humans.txt based on information from composer.json
 */
gulp.task("build:humans", function() {
    var composer = JSON.parse(fs.readFileSync("composer.json"));

    return gulp.src("src/humans.txt.tpl")
            .pipe(template({
                authors: composer.authors
            }))
            .pipe(rename("humans.txt"))
            .pipe(gulp.dest("dist/www"));
});

/**
 * Dev config
 */
gulp.task("build:config-dev", ["copy:config"], function() {
    return gulp.src("src/config/site.php.tpl")
            .pipe(template({
                enable_minify: "FALSE"
            }))
            .pipe(rename("site.php"))
            .pipe(gulp.dest("src/www/config"));
});

/**
 * Production config
 */
gulp.task("build:config-prod", ["copy:config"], function() {
    return gulp.src("src/config/site.php.tpl")
            .pipe(template({
                enable_minify: "TRUE"
            }))
            .pipe(rename("site.php"))
            .pipe(gulp.dest("dist/www/config"));
});

/**
 * Prepare for building...
 */
gulp.task("build:prepare", [
    "build:less",
    "build:scripts",
    "copy:controller"
]);


/**
 * Public tasks
 * 
 * Estas son las tareas que comunmente se ejecutan en la línea de comandos.
 */

/**
 * Inicia un servidor web en el puerto 4000
 */
gulp.task("serve", function() {
    server.start();
});

/**
 * Build the website, excluding unnecesary files. This should be called before
 * deploying, as it will generate the production ready website under dist/www
 */
gulp.task("build", [
    "build:prepare",
    "build:config-prod",
    "build:humans",
    "build:minify"],
        function() {
            var sources = [
                "src/www/**",
                "!src/www/config/site.php",
                "!src/www/themes/site/{css,less,js}{,/**}",
                "!src/www/{css,js}{,/**}"
            ];

            if (argv.exclude) {
                sources.push("!src/www/" + argv.exclude + "{,/**}");
            }
            
            return gulp.src(sources).pipe(gulp.dest("dist/www"));
        });

/**
 * Create zip file for distribution.
 */
gulp.task("dist", ["build"], function() {
    return gulp.src("dist/www/**")
            .pipe(zip("site.zip"))
            .pipe(gulp.dest("dist"));
});

/**
 * Debe ejecutarse en una terminal mientras se esté trabajando en el proyecto.
 * Se encarga de observar cambios en distintos archivos y al detectarlos
 * regenerarlos con la información actualizada.
 * 
 * Además, inicializa un servidor web y configura livereload para recargar
 * el navegador automáticamente cuando se detecta un cambio en los archivos
 * que observa gulp.
 */
gulp.task("default", ["build:prepare"], function() {
    // inicializa el servidor web y el servidor livereload
    server.livestart();

    gulp.watch(["src/config/**"], ["build:config-dev"]);
    gulp.watch(["src/controller.php"], ["copy:controller"]);
    gulp.watch(["src/humans.txt.tpl"], ["build:humans"]);
    gulp.watch(["src/www/themes/site/js/**"], ["build:scripts"]);
    gulp.watch(["src/www/themes/site/less/**/*.less"], ["build:less"]);

    gulp.watch([
        "src/config/**/*",
        "src/www/**/*.php",
        "src/www/js/**/*.js",
        "src/www/css/**/*.css"
    ], function(event) {
        server.notify(event);
    });
});

// shortcuts
gulp.task("rebuild", ["clean"], function() {
    return gulp.start("build");
});

gulp.task("redist", ["clean"], function() {
    return gulp.start("dist");
});