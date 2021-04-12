const canvas = document.getElementById("canvas");

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

const width = 800,
  height = 500;
const svg = d3.select('#canvas')
  .append('svg')
    .attr('width', width)
    .attr('height', height);

const projection = d3.geoMercator()
  .translate([width / 2, height / 1.4])
  .scale([150]);

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
    // d3.json('data/util/pop.json'),
    // d3.json('data/util/gdp.json'),
    // d3.json('data/util/undernourishment.json')
  ]).then(files => {
    console.log("DONE");
    d3.select('#loading-layer').remove();
    stopSpinner();
    const tradeMatrix = files[0],
          numToFOA = files[1],
          foaToNum = files[2],
          countryLatLong = files[3];
    const df = new dfjs.DataFrame(tradeMatrix);
    map.on('click', function(e) {
      console.log('clicked ');
      svg.selectAll('.trade-line').remove();
      let features = [];
      const {id, properties: { name } } = e;
      // get lat, long, and code
      const { latitude: lat, longitude: long, country } = countryLatLong[id];
      const num = foaToNum[id];
      // run query with code
      // const product = foodselection[0], type = typeRadio, currentYear = 2003;
      const product = 'Milk', type = 'Export', currentYear = 2003;
      const exportQ = df.where(row => row.get('Reporter Country Code') == num && row.get('Item') === product && row.get('Element') === `${type} Quantity`);
      const quantities = exportQ.select(`Y${currentYear}`).toArray().flat();
      const partners = exportQ.select('Partner Country Code').toArray().flat();
      var ix = quantities.map((x,i) => i);
      ix.sort((a, b) => quantities[b] - quantities[a]);
      const exportQY = ix.map(x => quantities[x]);
      const exportQPartners = ix.map(x => partners[x]);
      // for (let i = 0; i < exportQY.length; i++) {
      for (let i = 0; i < 10; i++) {
        const alpha3 = numToFOA[exportQPartners[i]];
        if (alpha3 != undefined) {
          const ll = countryLatLong[alpha3];
          if (ll != undefined) {
            const { latitude, longitude } = ll;
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
          }
        }
      }
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
    });
  });
//
  // }, 1500);
}