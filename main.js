/* HELPER FUNCTIONS */
function startSpinner() {
  const spinner = document.createElement('div');
  spinner.setAttribute('id', 'spinner');
  canvas.appendChild(spinner);
}
function stopSpinner() {
  const spinner = document.getElementById('spinner');
  canvas.removeChild(spinner);
}
function curve(context) {
  var custom = d3.curveLinear(context);
  custom._context = context;
  custom.point = function(x,y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        this.x0 = x; this.y0 = y;        
        break;
      case 1: this._point = 2;
      default:
        var x1 = this.x0 * 0.5 + x * 0.5;
        var y1 = this.y0 * 0.5 + y * 0.5;
        var m = 1/(y1 - y)/(x1 - x);
        var r = -100; // offset of mid point.
        var k = r / Math.sqrt(1 + (m*m) );
        if (m == Infinity) {
          y1 += r;
        } else {
          y1 += k;
          x1 += m*k;
        }     
        this._context.quadraticCurveTo(x1,y1,x,y); 
        this.x0 = x; this.y0 = y;        
      break;
    }
  }
  return custom;
}
function abbreviateNumber(number) {
  const SI_POSTFIXES = ["", "k", "M", "B", "T", "P", "E"];
  const sign = number < 0 ? '-1' : '';
  const absNumber = Math.abs(number);
  const tier = Math.log10(absNumber) / 3 | 0;
  // if zero, we don't need a prefix
  if(tier == 0) return `${absNumber}`;
  // get postfix and determine scale
  const postfix = SI_POSTFIXES[tier];
  const scale = Math.pow(10, tier * 3);
  // scale the number
  const scaled = absNumber / scale;
  const floored = Math.floor(scaled * 10) / 10;
  // format number and add postfix as suffix
  let str = floored.toFixed(1);
  // remove '.0' case
  str = (/\.0$/.test(str)) ? str.substr(0, str.length - 2) : str;
  return `${sign}${str}${postfix}`;
}
function commafy(num) {
  var str = num.toString().split('.');
  if (str[0].length >= 5) {
      str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  }
  if (str[1] && str[1].length >= 5) {
      str[1] = str[1].replace(/(\d{3})/g, '$1 ');
  }
  return str.join('.');
}

/* HTML listeners */
let currentYear = document.getElementById("year-slider").value;
let selectedFood = null, selectedCountry = null;
const canvas = document.getElementById("canvas");
const panel = document.getElementById("panel");
const panelDefault = panel.innerHTML;
let countryButtons = function() {
  const countrySelectors = document.querySelectorAll('.country-item');
  for (let i = 0; i < countrySelectors.length; i++) {
    if (countrySelectors[i].id == selectedCountry && document.querySelector('.country-item.selected') != null) {
      countrySelectors[i].classList.add('selected');
    } else {
      countrySelectors[i].classList.remove('selected');
    }
    countrySelectors[i].onclick = function() {
      const prev = document.querySelector('.country-item.selected');
      if (prev != null) {
        prev.classList.remove('selected');
      }
      selectedCountry = this.id;
      const cl = this.classList;
      if (cl.contains('selected')) {
        this.classList.remove('selected');
      } else {
        this.classList.add('selected');
      }
    }
  }
}
countryButtons();
let foodButtons = function() {
  const foodSelectors = document.querySelectorAll('.food');
  for (let i = 0; i < foodSelectors.length; i++) {
    if (foodSelectors[i].id == selectedFood && document.querySelector('.food.selected') != null) {
      foodSelectors[i].classList.add('selected');
    } else {
      foodSelectors[i].classList.remove('selected');
    }
    foodSelectors[i].onclick = function() {
      const prev = document.querySelector('.food.selected');
      if (prev != null) {
        prev.classList.remove('selected');
      }
      selectedFood = this.id;
      const cl = this.classList;
      if (cl.contains('selected')) {
        this.classList.remove('selected');
      } else {
        this.classList.add('selected');
      }
    }
  }
}
foodButtons();
var slider = document.getElementById("year-slider");
var output = document.getElementById("year");
output.innerHTML = slider.value;
slider.oninput = function() {
  output.innerHTML = this.value;
  currentYear = this.value;
  selectedCountry = null;
};

const width = 800,
  height = 600;
const svg = d3.select('#canvas')
  .append('svg')
    .attr('width', width)
    .attr('height', height);

const projection = d3.geoMercator()
  .translate([width / 2, height / 1.4])
  .scale([150]);

const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
  .domain([0, 65297.51751]);

let map, path;
d3.json('data/world.geojson.json').then(geoData => {
  path = d3.geoPath().projection(projection);
  map = svg.append('g')
    .selectAll('path')
    .data(geoData.features)
    .join('path')
    .attr('d', path)
    .attr('class', 'country');
  const buttonHeight = 150, buttonWidth = 300;
  svg.append('rect')
    .attr('id', 'loading-layer')
    .attr('height', height)
    .attr('width', width)
    .attr('fill', 'rgba(0,0,0,0.2)');
  svg.append('rect')
    .attr('class', 'start-button')
    .attr('height', buttonHeight)
    .attr('width', buttonWidth)
    .attr('transform', `translate(
      ${(width / 2) - (buttonWidth / 2)},
      ${(height / 2) - (buttonHeight / 2)}
    )`)
    .on('click', () => beginInteraction());
  svg.append("text")
    .attr('class', 'start-text')
    .attr("x", (width / 2))
    .attr("y", (height / 2))
    .attr('font-size', 30)
    .attr("dy", ".35em")
    .attr('text-anchor', 'middle')
    .text('START');
});
function beginInteraction() {
  startSpinner();
  d3.select('.start-button').remove();
  d3.select('.start-text').remove();
  // setTimeout(function() {
//
  return Promise.all([
    d3.csv('https://media.githubusercontent.com/media/OwlPudding/GrowThatFood/master/tm.csv'),
    d3.json('data/util/numToFOA.json'),
    d3.json('data/util/foaToNum.json'),
    d3.json('data/util/countryLatLong.json'),
    d3.json('data/util/pop.json'),
    d3.json('data/util/gdp.json'),
    d3.json('data/util/undernourishment.json'),
    d3.json('data/util/codeToCountry.json')
  ]).then(files => {
    const tradeMatrix = files[0],
          numToFOA = files[1],
          foaToNum = files[2],
          countryLatLong = files[3],
          pop = files[4],
          gdp = files[5],
          undernourishment = files[6],
          codeToCountry = files[7];
    const df = new dfjs.DataFrame(tradeMatrix);
    d3.select('#loading-layer').remove();
    stopSpinner();
    
    const colorMap = function() {
      map.style('fill', function(d) {
        try {
          const country_gdp = gdp[d.id][currentYear];
          return(colorScale(country_gdp));
        } catch {
          return 0
        }
      });
    };
    colorMap();
    countryButtons = function() {
      const countrySelectors = document.querySelectorAll('.country-item');
      for (let i = 0; i < countrySelectors.length; i++) {
        if (countrySelectors[i].id === selectedCountry) {
          countrySelectors[i].classList.add('selected');
        } else if (countrySelectors[i].classList.contains('selected')) {
          countrySelectors[i].classList.remove('selected');
        }
        countrySelectors[i].onclick = function() {
          if (this.classList.contains('selected')) {
            selectedCountry = null;
            this.classList.remove('selected');
            svg.selectAll('.trade-line').remove();
            panel.innerHTML = panelDefault;
          } else {
            selectedCountry = this.id;
            drawLines(selectedCountry);
          }
          countryButtons();
        }
      }
    }
    foodButtons = function() {
      const foodSelectors = document.querySelectorAll('.food');
      for (let i = 0; i < foodSelectors.length; i++) {
        if (foodSelectors[i].id === selectedFood) {
          foodSelectors[i].classList.add('selected');
        } else if (foodSelectors[i].classList.contains('selected')) {
          foodSelectors[i].classList.remove('selected');
        }
        foodSelectors[i].onclick = function() {
          if (this.classList.contains('selected')) {
            selectedFood = null;
            selectedCountry = null;
            countryButtons();
            svg.selectAll('.trade-line').remove();
            this.classList.remove('selected');
            panel.innerHTML = panelDefault;
          } else {
            selectedFood = this.id;
            if (selectedCountry != null) {
              drawLines(selectedCountry);
            }
          }
          foodButtons();
        }
      }
    }
    slider.oninput = function() {
      output.innerHTML = this.value;
      currentYear = this.value;
      selectedCountry = null;
      selectedFood = null;
      panel.innerHTML = panelDefault;
      svg.selectAll('.trade-line').remove();

      colorMap();
      foodButtons();
      countryButtons();
    };
    const drawLines = function(id) {
      svg.selectAll('.trade-line').remove();
      let features = [];
      const stats = {
        "gdp": gdp[id][currentYear],
        "pop": pop[id][currentYear],
        "undernourishment": undernourishment[id][`P${currentYear}`]
      };
      const { latitude: lat, longitude: long, country } = countryLatLong[id];
      const num = foaToNum[id];
      // run query with code
      const product = selectedFood, type = 'Export'; // currentYear defined in slider
      // console.log("PRODUCT",product,"YEAR",currentYear);

      const query = df.where(row => row.get('Reporter Country Code') == num && row.get('Item') == product);
      // console.log(query);
      const quantDf = query.where(row => row.get('Element') == `${type} Quantity`);
      const quantities = quantDf.select(`Y${currentYear}`).toArray().flat(); // tonnes
      const partners   = quantDf.select('Partner Country Code').toArray().flat();
      const values     = query.where(row => row.get('Element') == `${type} Value`).select(`Y${currentYear}`).toArray().flat(); // 1000 US$
      // console.log("Quantities =", quantities.length, " and Values =", values.length, "and Partners =", partners.length);
      let ix = quantities.map((x, i) => i);
      ix.sort((a, b) => quantities[b] - quantities[a]);
      const qSorted = ix.map(x => quantities[x]);
      const vSorted = ix.map(x => values[x]);
      const pSorted = ix.map(x => partners[x]);
    
      // console.log('quantities');
      // console.log(qSorted);
      // console.log('values');
      // console.log(vSorted);
      // console.log('partners');
      // console.log(pSorted);
    
      let top10 = [];
      for (let i = 0; i < 10; i++) {
        const alpha3 = numToFOA[pSorted[i]];
        if (alpha3 != undefined) {
          const ll = countryLatLong[alpha3];
          if (ll != undefined) {
            const { latitude, longitude } = ll;
            const quant = qSorted[i], val = (parseFloat(vSorted[i]) * 1000).toFixed(2);
            if (qSorted[i] != "" && val != NaN) {
              features.push({
                "source": {
                  "lat": lat,
                  "lon": long
                },
                "destination": {
                  "lat": latitude,
                  "lon": longitude
                }
              });
              top10.push(`${codeToCountry[alpha3]} ${commafy(quant)} tonnes $${commafy(val)}`);
            }
          }
        }
      }
      console.log(top10);
      console.log(stats);

      const divs = top10.reduce((str, entry) => {
        str += `<div class="top10-item">${entry}</div>`;
        return str;
      }, '');
      panel.innerHTML = `
        ${top10.length == 0 ? `
        <span id="panel-title">${codeToCountry[id]} Statistics</span>
        <span class="subtitle">No ${selectedCountry} ${type} data for ${codeToCountry[id]} in ${currentYear}</span>` :
        `<span id="panel-title">${codeToCountry[id]} Top ${top10.length} ${selectedFood} ${type} Partners</span>`}
        <div class="top10">
          ${divs}
        </div>
        ${top10.length == 0 ? `` : `
        <div class="graph-area">
          <div id="graph"></div>
        </div>`}
        <div class="stats">
          <div class="stat">
            <h3>${abbreviateNumber(parseFloat(stats.gdp))}</h3>
            <span>GDP per capita of ${codeToCountry[id]}</span>
          </div>
          <div class="stat">
            <h3>${abbreviateNumber(parseFloat(stats.pop))}</h3>
            <span>(population)</span>
          </div>
          <div class="stat">
            <h3>${stats.undernourishment}%</h3>
            <span>of population undernourished</span>
          </div>
        </div>
      `;
      const line = d3.line()
        .x(function(d) {
          return projection([d.lon, d.lat])[0];
        })
        .y(function(d) {
          return projection([d.lon, d.lat])[1];
        })
        .curve(curve);
      svg.selectAll(null)
        .data(features)
        .join("path")
        .datum(function(d) {
          return [d.source, d.destination]; // d3.line expects an array where each item represnts a vertex.
        })
        .attr('d',line)
        .attr('class', 'trade-line')
        .style('fill', 'none')
        .style('stroke','rgba(0,0,0,0.4)')
        .style('stroke-width', 2);
    }
      /* Defining legend here */
    svg.append("g")
      .attr("class", "legendSequential")
      .attr("transform", "translate(20, 370)");
    var legendSequential = d3.legendColor()
      .shapeWidth(60)
      .shapePadding(2)
      .cells(10)
      .orient("vertical")
      .title("GDP per Capita")
      .scale(colorScale);
    svg.select(".legendSequential")
      .call(legendSequential);
    map.on('mouseover', function(d) {
      const { id } = d;
      if (gdp[id] != undefined) {
        const country_gdp = gdp[id][currentYear];
        d3.select(this)
          .style('fill', tinycolor(colorScale(country_gdp)).darken(10).toString());
      }
      const tgrp = svg.append("g")
        .attr("id", "tooltip")
        .attr("transform", (d, i) => `translate(${d3.mouse(this)[0] + 5},${d3.mouse(this)[1]})`);
      tgrp.append("text")
        .style("position", "absolute")
        .attr("text-anchor", "left")
        .attr("text-align", "center")
        .attr("font-family", "sans-serif")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("fill", "black")
        .text(codeToCountry[id]);
    });
    map.on('mouseout', function(d) {
      const { id } = d;
      if (gdp[id] != undefined) {
        const country_gdp = gdp[id][currentYear];
        d3.select(this)
          .style('fill', colorScale(country_gdp));
      }
      d3.select("#tooltip").remove();
    });
    map.on('click', function(e) {
      const { id } = e;
      if (id == selectedCountry) {
        selectedCountry = null;
        countryButtons();
        svg.selectAll('.trade-line').remove();
        panel.innerHTML = panelDefault;
      } else {
        selectedCountry = id;
        countryButtons();
        drawLines(selectedCountry);
      }
    });
  });
//
  // }, 1500);
}
