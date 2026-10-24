(() => {
  const markerStyles = `
    .facility-marker-v2 {
      position: relative;
      width: 1px;
      height: 1px;
      overflow: visible;
      cursor: pointer;
    }
    .facility-marker-v2__bin {
      position: absolute;
      left: -27px;
      bottom: 0;
      display: grid;
      place-items: center;
      width: 54px;
      height: 54px;
      border: 2px solid #fff;
      border-radius: 11px;
      background: #087f5b;
      box-shadow: 0 2px 7px rgba(0, 0, 0, .38);
    }
    .facility-marker-v2__bin img {
      display: block;
      width: 50px;
      height: 50px;
      object-fit: contain;
      pointer-events: none;
    }
    .facility-marker-v2__symbols {
      position: absolute;
      left: 25px;
      bottom: 2px;
      display: flex;
      align-items: center;
      gap: 1px;
      white-space: nowrap;
      pointer-events: none;
    }
    .facility-marker-v2__recycle {
      color: #075b46;
      font: 700 25px/1 Arial, "Noto Sans Symbols 2", sans-serif;
      -webkit-text-stroke: 1.5px #fff;
      paint-order: stroke fill;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .35));
    }
    .facility-marker-v2__fish {
      width: 31px;
      height: 21px;
      overflow: visible;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .35));
    }
    .facility-marker-v2__fish path {
      fill: none;
      stroke: #075b46;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      paint-order: stroke fill;
      vector-effect: non-scaling-stroke;
    }
    .facility-marker-v2__fish .halo {
      stroke: #fff;
      stroke-width: 4;
    }
    .facility-marker-v2__fish circle,
    .legend-facility-v2__fish circle {
      fill: #075b46;
      stroke: #fff;
      stroke-width: 1;
    }
    .legend-facility-v2 {
      gap: 7px !important;
    }
    .legend-facility-v2__bin {
      display: grid;
      place-items: center;
      flex: none;
      width: 28px;
      height: 28px;
      overflow: hidden;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 7px;
      background: #087f5b;
    }
    .legend-facility-v2__bin img {
      width: 27px;
      height: 27px;
      object-fit: contain;
    }
    .legend-facility-v2__recycle {
      display: grid;
      place-items: center;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #075b46;
      font-style: normal;
      font: 700 22px/1 Arial, "Noto Sans Symbols 2", sans-serif;
      -webkit-text-stroke: .5px #fff;
      paint-order: stroke fill;
    }
    .legend-facility-v2__fish {
      width: 28px;
      height: 18px;
      overflow: visible;
    }
    .legend-facility-v2__fish path {
      fill: none;
      stroke: #075b46;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `;

  const renderer = function renderFacilityMarkers() {
    clearFacilities();
    const bounds = map.getBounds();
    for (const facility of facilities) {
      if (facility.lng < bounds.getWest() || facility.lng > bounds.getEast() ||
          facility.lat < bounds.getSouth() || facility.lat > bounds.getNorth()) continue;

      const element = document.createElement('div');
      element.className = 'facility-marker-v2';
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', acceptanceLabel(facility));
      const symbols = [];
      if (facility.accept?.recycling) {
        symbols.push('<span class="facility-marker-v2__recycle" role="img" aria-label="Recycling accepted">♻</span>');
      }
      if (facility.accept?.food) {
        symbols.push('<svg class="facility-marker-v2__fish" viewBox="0 0 44 24" role="img" aria-label="Food scraps accepted"><path class="halo" d="M8 12H34M8 12Q4 7 1 6L4 12 1 18Q4 17 8 12M34 12 42 5V19Z M12 12 17 5M12 12 17 19M19 12 24 5M19 12 24 19M26 12 31 5M26 12 31 19"/><path d="M8 12H34M8 12Q4 7 1 6L4 12 1 18Q4 17 8 12M34 12 42 5V19Z M12 12 17 5M12 12 17 19M19 12 24 5M19 12 24 19M26 12 31 5M26 12 31 19"/><circle cx="5" cy="11" r="1"/></svg>');
      }
      element.innerHTML = `<span class="facility-marker-v2__bin"><img src="v2/assets/fixed-dropoff-bin.webp" alt=""></span><span class="facility-marker-v2__symbols">${symbols.join('')}</span>`;

      const popup = new maplibregl.Popup({ offset: 22 }).setHTML(
        `<b>${esc(facility.name)}</b><br><small>${esc(facility.district)} · ${esc(T[lang].facilityTitle)}</small><br>${esc(facility.address)}<br><b>${esc(T[lang].hours)}:</b> ${esc(facility.hours)}<br><b>${esc(T[lang].accepts)}:</b> ${esc(acceptanceLabel(facility))}${facility.note ? `<br><small>${esc(facility.note)}</small>` : ''}<br><small>${esc(T[lang].bag)}</small><br><a href="${gmaps(facility.lat, facility.lng)}" target="_blank" rel="noopener">${T[lang].maps}</a>`
      );
      facilityMarkers.push(new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([facility.lng, facility.lat])
        .setPopup(popup)
        .addTo(map));
    }
  };

  window.installFacilityMarkerV2 = function installFacilityMarkerV2(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      if (!doc.getElementById('v2-facility-marker-styles')) {
        const style = doc.createElement('style');
        style.id = 'v2-facility-marker-styles';
        style.textContent = markerStyles;
        doc.head.appendChild(style);
      }
      const facilityLegend = doc.getElementById('lf');
      if (facilityLegend && !facilityLegend.parentElement.classList.contains('legend-facility-v2')) {
        const host = facilityLegend.parentElement;
        const fishLegend = '<svg class="legend-facility-v2__fish" viewBox="0 0 44 24" role="img" aria-label="Food scraps accepted"><path d="M8 12H34M8 12Q4 7 1 6L4 12 1 18Q4 17 8 12M34 12 42 5V19Z M12 12 17 5M12 12 17 19M19 12 24 5M19 12 24 19M26 12 31 5M26 12 31 19"/><circle cx="5" cy="11" r="1"/></svg>';
        host.classList.add('legend-facility-v2');
        host.innerHTML = `<span class="legend-facility-v2__bin" role="img" aria-label="Fixed drop-off"><img src="v2/assets/fixed-dropoff-bin.webp" alt=""></span><b id="lf">${facilityLegend.textContent}</b><i class="legend-facility-v2__recycle" role="img" aria-label="Recycling accepted">♻</i>${fishLegend}`;
      }
      const script = doc.createElement('script');
      script.textContent = `renderFacilityMarkers = (${renderer.toString()}); try { if (map.loaded() && facilities.length) renderFacilityMarkers(); } catch (error) { console.warn('V2 facility markers will render on the next map update', error); }`;
      doc.head.appendChild(script);
    } catch (error) {
      console.error('Could not install V2 facility markers', error);
    }
  };
})();
