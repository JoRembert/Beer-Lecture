import { resolve as pathResolve } from 'path';
import templates from './src/templates.js';
import { init, plugins } from '@twirl/book-builder';
import { readFileSync, writeFileSync } from 'fs';

const l10n = {
    en: JSON.parse(readFileSync('./src/en/l10n.json', 'utf-8')),
    ru: JSON.parse(readFileSync('./src/ru/l10n.json', 'utf-8'))
};

const langsToBuild = (process.argv[2] &&
    process.argv[2].split(',').map((s) => s.trim())) || ['ru', 'en'];

const targets = (
    (process.argv[3] && process.argv[3].split(',')) || [
        'html',
        'pdf',
        'epub',
        'landing'
    ]
).reduce((targets, arg) => {
    targets[arg.trim()] = true;
    return targets;
}, {});

const chapters = process.argv[4];

console.log(`Building langs: ${langsToBuild.join(', ')}…`);
langsToBuild.forEach((lang) => {
    init({
        l10n: l10n[lang],
        basePath: pathResolve(`src`),
        path: pathResolve(`src/${lang}/clean-copy`),
        templates,
        pipeline: {
            css: {
                beforeAll: [
                    plugins.css.backgroundImageDataUri,
                    plugins.css.fontFaceDataUri
                ]
            },
            ast: {
                preProcess: [
                    plugins.ast.h3ToTitle,
                    plugins.ast.incuts({
                        funFact: 'Fun Fact. ',
                        beerMyth: 'Beer Myth. '
                    }),
                    plugins.ast.aImg,
                    plugins.ast.imgSrcResolve,
                    plugins.ast.ref,
                    plugins.ast.ghTableFix
                ]
            },
            htmlSourceValidator: {
                validator: 'WHATWG',
                ignore: ['heading-level', 'no-raw-characters']
            },
            html: {
                postProcess: [plugins.html.imgDataUri]
            }
        },
        chapters
    }).then((builder) => {
        Object.keys(targets).forEach((target) => {
            if (target !== 'landing') {
                builder.build(
                    target,
                    pathResolve('docs', `${l10n[lang].file}.${lang}.${target}`)
                );
            } else {
                const landingHtml = templates.landing(
                    builder.structure,
                    l10n[lang],
                    lang
                );
                writeFileSync(
                    pathResolve('docs', l10n[lang].landingFile),
                    landingHtml
                );
            }
        });
    });
});
