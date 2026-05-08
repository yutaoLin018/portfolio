import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;
let commits;

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
        });
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('Total files');
    dl.append('dd').text(d3.group(data, (d) => d.file).size);

    dl.append('dt').text('Longest line');
    dl.append('dd').text(d3.max(data, (d) => d.length));

    dl.append('dt').text('Average line length');
    dl.append('dd').text(Math.round(d3.mean(data, (d) => d.length)));

    dl.append('dt').text('Max depth');
    dl.append('dd').text(d3.max(data, (d) => d.depth));
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
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
    const width = 1000;
    const height = 600;

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

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([3, 30]);

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
        .data(sortedCommits)
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

    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);
    
    createBrushSelector(svg);
}

let data = await loadData();
commits = processCommits(data);

console.log(data);
console.log(commits);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);