import puppeteer = require('puppeteer');


(async () => {
    let browserOuterScope: null|puppeteer.Browser = null;
    try {
        /* region === main application === */
        const browser = await puppeteer.launch({headless: true});
        browserOuterScope = browser;

        const page = await browser.newPage();
        await page.goto("https://edtools.cc/pve?s=HIP+36014&md=250&lo=on&sc=2");

        const systemsT = await page.evaluate(() => {
            // Get all target systems
            const links: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('#sys_tbl td:nth-child(10) > a:nth-child(2)');

            let res = [];
            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                const split = link.href.split("/");
                res.push(split[split.length - 1]);
            }

            // remove duplicates
            return [...new Set(res)];
        });
        await page.close();

        const systems = systemsT;

        let processed = 0;
        const details = await Promise.all(systems.map(async (systemId) => {
            const tic = new Date().getTime();
            const page = await browser.newPage();
            await page.goto(`https://eddb.io/system/bodies/${systemId}`, {timeout: 0});

            const details = await page.evaluate(() => {
                let allTr = [...document.querySelectorAll('tr')];
                allTr = allTr.filter((x) => {
                    const name: null|HTMLTableCellElement  = x.querySelector('td:nth-child(1)');
                    return name !== null && name.innerText === "Distance To Arrival:";
                });

                let maximum = -1;
                let planetAmount = 0;
                allTr.forEach((x) => {
                    const distance = parseInt((<HTMLTableCellElement>x.querySelector('td:nth-child(2)')).innerText.replaceAll(',',''));
                    if (maximum < distance) {
                        maximum = distance;
                    }
                    planetAmount++;
                });
                const name = (<HTMLHeadElement>document.querySelector("h1")).innerText.substring('System '.length);
                return {
                    distance: maximum,
                    name,
                    planetAmount,
                };
            });
            await page.close();
            processed++;
            console.log(`processed ${processed} / ${systems.length}`);
            return details;
        }));

        const infos = details.map(((value, index) => {
            return {
                systemId: systems[index],
                distance: value.distance,
                name: value.name,
                planetAmount: value.planetAmount,
            };
        }));

        infos.sort((a, b) => {
            if (a.distance < b.distance) {
                return -1;
            }
            if (b.distance < a.distance) {
                return 1;
            }
            return 0;
        });

        console.warn("The distance to the furthest station is not being included in the calculation!" +
            "You have to check this manually using https://eddb.io/system/ (appending the systemId after the slash)");
        console.log(infos);

    } catch (e) {
        console.error(<Error>e);
    }
    if(browserOuterScope !== null) {
        await browserOuterScope.close();
    }
})();

function sleep(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
