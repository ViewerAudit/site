// Charts and visualization for Viewer Audit

// Chart utilities
const ChartUtils = {
    // Create SVG element
    createSVG(width, height) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        return svg;
    },

    // Create SVG element with namespace
    createElement(tag, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    },

    // Calculate chart dimensions
    calculateDimensions(container, aspectRatio = 16/9) {
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = width / aspectRatio;
        return { width, height };
    },

    // Generate colors
    getColor(index, total) {
        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
            '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#f97316'
        ];
        return colors[index % colors.length];
    },

    // Format axis labels
    formatAxisLabel(value, type = 'number') {
        if (type === 'number') {
            return ViewerAuditUtils.formatNumber(value);
        } else if (type === 'duration') {
            return ViewerAuditUtils.formatDuration(value);
        }
        return value;
    }
};

// Bar chart component
class BarChart {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: 600,
            height: 400,
            margin: { top: 20, right: 20, bottom: 40, left: 60 },
            colors: ['#6366f1'],
            showGrid: true,
            showValues: true,
            ...options
        };
        
        this.render();
    }

    render() {
        // Clear container
        this.container.innerHTML = '';
        
        const { width, height, margin } = this.options;
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Create SVG
        const svg = ChartUtils.createSVG(width, height);
        this.container.appendChild(svg);

        // Calculate scales
        const maxValue = Math.max(...this.data.map(d => d.value));
        const barWidth = chartWidth / this.data.length * 0.8;
        const barSpacing = chartWidth / this.data.length * 0.2;

        // Create chart group
        const chartGroup = ChartUtils.createElement('g', {
            transform: `translate(${margin.left}, ${margin.top})`
        });
        svg.appendChild(chartGroup);

        // Draw grid
        if (this.options.showGrid) {
            this.drawGrid(chartGroup, chartWidth, chartHeight, maxValue);
        }

        // Draw bars
        this.data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = index * (barWidth + barSpacing);
            const y = chartHeight - barHeight;

            // Create bar
            const bar = ChartUtils.createElement('rect', {
                x: x,
                y: y,
                width: barWidth,
                height: barHeight,
                fill: this.options.colors[index % this.options.colors.length],
                rx: 4,
                ry: 4
            });
            chartGroup.appendChild(bar);

            // Add value label
            if (this.options.showValues) {
                const valueLabel = ChartUtils.createElement('text', {
                    x: x + barWidth / 2,
                    y: y - 5,
                    'text-anchor': 'middle',
                    'font-size': '12px',
                    fill: '#6b7280'
                });
                valueLabel.textContent = ChartUtils.formatAxisLabel(item.value);
                chartGroup.appendChild(valueLabel);
            }

            // Add category label
            const categoryLabel = ChartUtils.createElement('text', {
                x: x + barWidth / 2,
                y: chartHeight + 20,
                'text-anchor': 'middle',
                'font-size': '12px',
                fill: '#6b7280'
            });
            categoryLabel.textContent = item.label;
            chartGroup.appendChild(categoryLabel);
        });

        // Draw axes
        this.drawAxes(chartGroup, chartWidth, chartHeight, maxValue);
    }

    drawGrid(group, width, height, maxValue) {
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = (i / gridLines) * height;
            const value = (maxValue * (gridLines - i) / gridLines);
            
            const line = ChartUtils.createElement('line', {
                x1: 0,
                y1: y,
                x2: width,
                y2: y,
                stroke: '#e5e7eb',
                'stroke-width': 1
            });
            group.appendChild(line);

            const label = ChartUtils.createElement('text', {
                x: -10,
                y: y + 4,
                'text-anchor': 'end',
                'font-size': '12px',
                fill: '#6b7280'
            });
            label.textContent = ChartUtils.formatAxisLabel(value);
            group.appendChild(label);
        }
    }

    drawAxes(group, width, height, maxValue) {
        // Y-axis
        const yAxis = ChartUtils.createElement('line', {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: height,
            stroke: '#374151',
            'stroke-width': 2
        });
        group.appendChild(yAxis);

        // X-axis
        const xAxis = ChartUtils.createElement('line', {
            x1: 0,
            y1: height,
            x2: width,
            y2: height,
            stroke: '#374151',
            'stroke-width': 2
        });
        group.appendChild(xAxis);
    }
}

// Line chart component
class LineChart {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: 600,
            height: 400,
            margin: { top: 20, right: 20, bottom: 40, left: 60 },
            color: '#6366f1',
            showPoints: true,
            showArea: false,
            ...options
        };
        
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        
        const { width, height, margin } = this.options;
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const svg = ChartUtils.createSVG(width, height);
        this.container.appendChild(svg);

        const chartGroup = ChartUtils.createElement('g', {
            transform: `translate(${margin.left}, ${margin.top})`
        });
        svg.appendChild(chartGroup);

        // Calculate scales
        const maxValue = Math.max(...this.data.map(d => d.value));
        const minValue = Math.min(...this.data.map(d => d.value));
        const valueRange = maxValue - minValue;

        // Create path
        const points = this.data.map((item, index) => {
            const x = (index / (this.data.length - 1)) * chartWidth;
            const y = chartHeight - ((item.value - minValue) / valueRange) * chartHeight;
            return `${x},${y}`;
        });

        const pathData = `M ${points.join(' L ')}`;

        // Draw area if enabled
        if (this.options.showArea) {
            const areaPath = ChartUtils.createElement('path', {
                d: `${pathData} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`,
                fill: this.options.color,
                opacity: 0.2
            });
            chartGroup.appendChild(areaPath);
        }

        // Draw line
        const line = ChartUtils.createElement('path', {
            d: pathData,
            stroke: this.options.color,
            'stroke-width': 3,
            fill: 'none'
        });
        chartGroup.appendChild(line);

        // Draw points
        if (this.options.showPoints) {
            this.data.forEach((item, index) => {
                const x = (index / (this.data.length - 1)) * chartWidth;
                const y = chartHeight - ((item.value - minValue) / valueRange) * chartHeight;

                const point = ChartUtils.createElement('circle', {
                    cx: x,
                    cy: y,
                    r: 4,
                    fill: this.options.color
                });
                chartGroup.appendChild(point);
            });
        }

        // Draw axes
        this.drawAxes(chartGroup, chartWidth, chartHeight, minValue, maxValue);
    }

    drawAxes(group, width, height, minValue, maxValue) {
        // Y-axis
        const yAxis = ChartUtils.createElement('line', {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: height,
            stroke: '#374151',
            'stroke-width': 2
        });
        group.appendChild(yAxis);

        // X-axis
        const xAxis = ChartUtils.createElement('line', {
            x1: 0,
            y1: height,
            x2: width,
            y2: height,
            stroke: '#374151',
            'stroke-width': 2
        });
        group.appendChild(xAxis);

        // Y-axis labels
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = (i / gridLines) * height;
            const value = minValue + (maxValue - minValue) * (gridLines - i) / gridLines;
            
            const label = ChartUtils.createElement('text', {
                x: -10,
                y: y + 4,
                'text-anchor': 'end',
                'font-size': '12px',
                fill: '#6b7280'
            });
            label.textContent = ChartUtils.formatAxisLabel(value);
            group.appendChild(label);
        }
    }
}

// Pie chart component
class PieChart {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: 400,
            height: 400,
            radius: 150,
            showLabels: true,
            showValues: true,
            ...options
        };
        
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        
        const { width, height, radius } = this.options;
        const centerX = width / 2;
        const centerY = height / 2;

        const svg = ChartUtils.createSVG(width, height);
        this.container.appendChild(svg);

        const total = this.data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = 0;

        this.data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const endAngle = currentAngle + sliceAngle;

            // Calculate arc coordinates
            const x1 = centerX + radius * Math.cos(currentAngle);
            const y1 = centerY + radius * Math.sin(currentAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            // Create large arc flag
            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

            // Create path
            const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');

            const slice = ChartUtils.createElement('path', {
                d: pathData,
                fill: ChartUtils.getColor(index, this.data.length),
                stroke: '#ffffff',
                'stroke-width': 2
            });
            svg.appendChild(slice);

            // Add label
            if (this.options.showLabels) {
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelRadius = radius * 0.7;
                const labelX = centerX + labelRadius * Math.cos(labelAngle);
                const labelY = centerY + labelRadius * Math.sin(labelAngle);

                const label = ChartUtils.createElement('text', {
                    x: labelX,
                    y: labelY,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                    'font-size': '14px',
                    fill: '#ffffff',
                    'font-weight': 'bold'
                });
                label.textContent = item.label;
                svg.appendChild(label);
            }

            // Add value
            if (this.options.showValues) {
                const valueAngle = currentAngle + sliceAngle / 2;
                const valueRadius = radius * 0.5;
                const valueX = centerX + valueRadius * Math.cos(valueAngle);
                const valueY = centerY + valueRadius * Math.sin(valueAngle);

                const value = ChartUtils.createElement('text', {
                    x: valueX,
                    y: valueY,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                    'font-size': '12px',
                    fill: '#ffffff'
                });
                value.textContent = ChartUtils.formatAxisLabel(item.value);
                svg.appendChild(value);
            }

            currentAngle = endAngle;
        });
    }
}

// Gauge chart component
class GaugeChart {
    constructor(container, value, maxValue, options = {}) {
        this.container = container;
        this.value = value;
        this.maxValue = maxValue;
        this.options = {
            width: 200,
            height: 200,
            radius: 80,
            color: '#6366f1',
            showValue: true,
            ...options
        };
        
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        
        const { width, height, radius } = this.options;
        const centerX = width / 2;
        const centerY = height / 2;

        const svg = ChartUtils.createSVG(width, height);
        this.container.appendChild(svg);

        // Calculate percentage
        const percentage = Math.min(this.value / this.maxValue, 1);
        const angle = percentage * Math.PI;

        // Draw background circle
        const backgroundCircle = ChartUtils.createElement('circle', {
            cx: centerX,
            cy: centerY,
            r: radius,
            fill: 'none',
            stroke: '#e5e7eb',
            'stroke-width': 12
        });
        svg.appendChild(backgroundCircle);

        // Draw progress arc
        const progressArc = ChartUtils.createElement('path', {
            d: this.createArcPath(centerX, centerY, radius, 0, angle),
            fill: 'none',
            stroke: this.options.color,
            'stroke-width': 12,
            'stroke-linecap': 'round'
        });
        svg.appendChild(progressArc);

        // Add value text
        if (this.options.showValue) {
            const valueText = ChartUtils.createElement('text', {
                x: centerX,
                y: centerY + 10,
                'text-anchor': 'middle',
                'font-size': '24px',
                'font-weight': 'bold',
                fill: '#1f2937'
            });
            valueText.textContent = Math.round(percentage * 100) + '%';
            svg.appendChild(valueText);
        }
    }

    createArcPath(cx, cy, radius, startAngle, endAngle) {
        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);

        const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

        return [
            `M ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
        ].join(' ');
    }
}

// Chart factory
const ChartFactory = {
    createBarChart(container, data, options) {
        return new BarChart(container, data, options);
    },

    createLineChart(container, data, options) {
        return new LineChart(container, data, options);
    },

    createPieChart(container, data, options) {
        return new PieChart(container, data, options);
    },

    createGaugeChart(container, value, maxValue, options) {
        return new GaugeChart(container, value, maxValue, options);
    }
};

// Export charts for use in other modules
window.ViewerAuditCharts = {
    ChartFactory,
    ChartUtils,
    BarChart,
    LineChart,
    PieChart,
    GaugeChart
}; 