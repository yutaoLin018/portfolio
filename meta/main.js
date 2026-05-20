import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;
let rScale;
let commits;
let filteredCommits;
let commitProgress = 100;
let timeScale;
let commitMaxTime;
let currentCommitId = null;

let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: 'https://github.com/yutaoLin018/portfolio/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false,
            });

            return ret;
        })
        .sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').text('COMMITS');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('FILES');
    dl.append('dd').text(d3.group(data, (d) => d.file).size);

    dl.append('dt').html('TOTAL <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('MAX DEPTH');
    dl.append('dd').text(d3.max(data, (d) => d.depth));

    dl.append('dt').text('LONGEST LINE');
    dl.append('dd').text(d3.max(data, (d) => d.length));

    dl.append('dt').text('MAX LINES');
    dl.append('dd').text(d3.max(commits, (d) => d.totalLines));
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('tooltip-commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (!commit) return;

    link.href = commit.url;
    link.textContent = commit.id.slice(0, 7);

    date.textContent = commit.datetime.toLocaleDateString('en', {
        dateStyle: 'full',
    });

    time.textContent = commit.datetime.toLocaleTimeString('en', {
        timeStyle: 'short',
    });

    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
}

function createBrushSelector(svg) {
    svg.call(d3.brush().on('start brush end', brushed));
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');

    countElement.textContent = `${
        selectedCommits.length || 'No'
    } commits selected`;

    return selectedCommits;
}

function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];

    const lines = selectedCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    const totalLines = d3.sum(Array.from(breakdown.values()));

    const dl = d3.select('#language-breakdown');
    dl.html('');

    if (selectedCommits.length === 0) {
        return;
    }

    for (const [type, count] of breakdown) {
        const percent = totalLines > 0 ? (count / totalLines) * 100 : 0;

        dl.append('dt').text(type);
        dl.append('dd').text(`${count} lines (${percent.toFixed(1)}%)`);
    }
}

function brushed(event) {
    const selection = event.selection;

    d3.selectAll('circle').classed('selected', (d) =>
        isCommitSelected(selection, d)
    );

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }

    const [[x0, y0], [x1, y1]] = selection;

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderScatterPlot(data, commits) {
    const width = 900;
    const height = 650;

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    rScale = d3
        .scaleSqrt()
        .domain(d3.extent(commits, (d) => d.totalLines))
        .range([3, 30]);

    const margin = { top: 10, right: 10, bottom: 30, left: 45 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3
            .axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    const xAxis = d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.timeFormat('%b %d'));

    const yAxis = d3
        .axisLeft(yScale)
        .tickValues([0, 4, 8, 12, 16, 20, 24])
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    createBrushSelector(svg);
}

function updateScatterPlot(data, commits) {
    const width = 900;
    const height = 650;
    const margin = { top: 10, right: 10, bottom: 30, left: 45 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart').select('svg');

    xScale = xScale
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const xAxis = d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.timeFormat('%b %d'));

    svg.select('g.x-axis')
        .transition()
        .duration(100)
        .call(xAxis);

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const dots = svg.select('g.dots');

    dots
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join(
            (enter) =>
                enter
                    .append('circle')
                    .attr('cx', (d) => xScale(d.datetime))
                    .attr('cy', (d) => yScale(d.hourFrac))
                    .attr('r', 0)
                    .attr('fill', 'steelblue')
                    .style('fill-opacity', 0.7)
                    .call((enter) =>
                        enter
                            .transition()
                            .duration(150)
                            .attr('r', (d) => rScale(d.totalLines))
                    ),
            (update) => update,
            (exit) =>
                exit
                    .transition()
                    .duration(150)
                    .attr('r', 0)
                    .remove()
        )
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
}

function onTimeSliderChange() {
    commitProgress = Number(this.value);
    commitMaxTime = timeScale.invert(commitProgress);

    d3.select('#commit-time').text(
        commitMaxTime.toLocaleString('en', {
            dateStyle: 'long',
            timeStyle: 'short',
        })
    );

    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

    updateScatterPlot(data, filteredCommits);
    updateFilesWithTransition(filteredCommits);
}

function updateFilesWithTransition(commits) {
    updateFileDisplay(commits);
}

function updateFileDisplay(commits) {
    const container = d3.select('#files');

    const oldPositions = new Map();

    container.selectAll('div.file').each(function (d) {
        if (d) {
            oldPositions.set(d.name, this.getBoundingClientRect().top);
        }
    });

    const lines = commits.flatMap((d) => d.lines);

    const files = d3
        .groups(lines, (d) => d.file)
        .map(([name, lines]) => {
            return { name, lines };
        })
        .sort((a, b) => b.lines.length - a.lines.length);

    const filesContainer = container
        .selectAll('div.file')
        .data(files, (d) => d.name)
        .join(
            (enter) =>
                enter
                    .append('div')
                    .attr('class', 'file')
                    .style('opacity', 0)
                    .call((div) => {
                        div.append('dt');
                        div.append('dd');
                    }),
            (update) => update,
            (exit) =>
                exit
                    .transition()
                    .duration(150)
                    .style('opacity', 0)
                    .remove()
        );

    filesContainer
        .select('dt')
        .html(
            (d) => `
                <code>${d.name}</code>
                <small>${d.lines.length} lines</small>
            `
        );

    filesContainer
        .select('dd')
        .selectAll('div.loc')
        .data((d) => d.lines, (d) => `${d.file}-${d.line}-${d.type}`)
        .join(
            (enter) =>
                enter
                    .append('div')
                    .attr('class', 'loc')
                    .style('opacity', 0),
            (update) => update,
            (exit) =>
                exit
                    .transition()
                    .duration(100)
                    .style('opacity', 0)
                    .remove()
        )
        .style('--color', (d) => colors(d.type))
        .transition()
        .duration(100)
        .style('opacity', 1);

    filesContainer.each(function (d) {
        const oldTop = oldPositions.get(d.name);
        const newTop = this.getBoundingClientRect().top;

        if (oldTop !== undefined) {
            const deltaY = oldTop - newTop;

            if (Math.abs(deltaY) > 1) {
                d3.select(this)
                    .interrupt()
                    .style('transform', `translateY(${deltaY}px)`)
                    .style('opacity', 1)
                    .transition()
                    .duration(450)
                    .ease(d3.easeCubicOut)
                    .style('transform', 'translateY(0)');
            } else {
                d3.select(this)
                    .interrupt()
                    .style('opacity', 1)
                    .style('transform', 'translateY(0)');
            }
        } else {
            d3.select(this)
                .interrupt()
                .style('transform', 'translateY(10px)')
                .transition()
                .duration(250)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .style('transform', 'translateY(0)');
        }
    });
}

function renderCommitStory(commits) {
    d3.select('#scatter-story')
        .selectAll('.step')
        .data(commits, (d) => d.id)
        .join('div')
        .attr('class', 'step')
        .html(
            (d, i) => `
                <p>
                    On ${d.datetime.toLocaleString('en', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                    })},
                    I made
                    <a href="${d.url}" target="_blank">
                        ${i > 0 ? 'another commit' : 'my first commit'}
                    </a>.
                </p>

                <p>
                    I edited ${d.totalLines} lines across ${
                        d3.rollups(
                            d.lines,
                            (D) => D.length,
                            (line) => line.file
                        ).length
                    } files.
                </p>
            `
        );
}

function renderFilesStory(commits) {
    d3.select('#files-story')
        .selectAll('.step')
        .data(commits, (d) => d.id)
        .join('div')
        .attr('class', 'step')
        .html(
            (d) => `
                <p>
                    By ${d.datetime.toLocaleString('en', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                    })},
                    the codebase included this commit:
                    <a href="${d.url}" target="_blank">
                        ${d.id.slice(0, 7)}
                    </a>.
                </p>

                <p>
                    This commit edited ${d.totalLines} lines across ${
                        d3.rollups(
                            d.lines,
                            (D) => D.length,
                            (line) => line.file
                        ).length
                    } files.
                </p>
            `
        );
}

function onStepEnter(response) {
    const commit = response.element.__data__;

    if (commit.id === currentCommitId && response.element.classList.contains('active')) {
        return;
    }

    currentCommitId = commit.id;
    commitMaxTime = commit.datetime;
    commitProgress = timeScale(commitMaxTime);

    d3.selectAll('.step').classed('active', (d) => d && d.id === commit.id);

    d3.select('#commit-progress').property('value', commitProgress);

    d3.select('#commit-time').text(
        commitMaxTime.toLocaleString('en', {
            dateStyle: 'long',
            timeStyle: 'short',
        })
    );

    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

    updateScatterPlot(data, filteredCommits);
    updateFilesWithTransition(filteredCommits);
}

let data = await loadData();
commits = processCommits(data);
filteredCommits = commits;

timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);

console.log(data);
console.log(commits);

renderCommitInfo(data, commits);
renderCommitStory(commits);
renderScatterPlot(data, commits);
renderFilesStory(commits);
updateFileDisplay(filteredCommits);

d3.select('#commit-progress').on('input', onTimeSliderChange);
onTimeSliderChange.call(document.querySelector('#commit-progress'));

const scatterScroller = scrollama();

scatterScroller
    .setup({
        container: '#scrolly-1',
        step: '#scrolly-1 .step',
        offset: 0.5,
    })
    .onStepEnter(onStepEnter);

const filesScroller = scrollama();

filesScroller
    .setup({
        container: '#scrolly-2',
        step: '#scrolly-2 .step',
        offset: 0.5,
    })
    .onStepEnter(onStepEnter);