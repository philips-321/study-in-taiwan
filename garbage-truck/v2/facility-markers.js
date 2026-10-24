(() => {
  const markerStyles = `
    .facility-marker-v2 {
      position: relative;
      width: 1px;
      height: 1px;
      overflow: visible;
      cursor: pointer;
    }
    .facility-marker-v2__image {
      position: absolute;
      left: -36px;
      bottom: 0;
      display: block;
      width: 72px;
      height: 72px;
      object-fit: contain;
      pointer-events: auto;
    }
    .legend-facility-v2__image {
      flex: none;
      width: 34px;
      height: 32px;
      object-fit: contain;
    }
    .legend-acceptance-v2 {
      gap: 7px !important;
    }
    .legend-acceptance-v2__recycle {
      color: #087f5b;
      font: normal 700 22px/1 Arial, "Noto Sans Symbols 2", sans-serif;
      -webkit-text-stroke: .5px #fff;
      paint-order: stroke fill;
    }
    .legend-acceptance-v2__fish {
      display: block;
      flex: none;
      width: 34px;
      height: 20px;
      background-color: #075b46;
      -webkit-mask: url("v2/assets/food-fishbone.webp") center / contain no-repeat;
      mask: url("v2/assets/food-fishbone.webp") center / contain no-repeat;
    }
    :root[data-theme="dark"] .legend-acceptance-v2__recycle { color: #69e5ad; }
    :root[data-theme="dark"] .legend-acceptance-v2__fish { background-color: #69e5ad; }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) .legend-acceptance-v2__recycle { color: #69e5ad; }
      :root:not([data-theme="light"]) .legend-acceptance-v2__fish { background-color: #69e5ad; }
    }
  `;

  const renderer = function renderFacilityMarkers() {
    clearFacilities();
    const bounds = map.getBounds();
    for (const sourceFacility of facilities) {
      const facility = sourceFacility.name === '南港分隊'
        ? { ...sourceFacility, accept: { ...sourceFacility.accept, food: false }, note: '不收廚餘' }
        : sourceFacility;
      if (facility.lng < bounds.getWest() || facility.lng > bounds.getEast() ||
          facility.lat < bounds.getSouth() || facility.lat > bounds.getNorth()) continue;

      const element = document.createElement('div');
      element.className = 'facility-marker-v2';
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', `${T[lang].facilityTitle}: ${facility.name}`);
      element.innerHTML = '<img class="facility-marker-v2__image" src="v2/assets/fixed-dropoff-bin.webp" alt="">';

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
        host.classList.add('legend-facility-v2');
        host.innerHTML = `<img class="legend-facility-v2__image" src="v2/assets/fixed-dropoff-bin.webp" alt=""><b id="lf">${facilityLegend.textContent}</b>`;
        const legend = host.parentElement;
        const recyclingItem = doc.createElement('span');
        recyclingItem.className = 'legend-acceptance-v2';
        recyclingItem.innerHTML = '<i class="legend-acceptance-v2__recycle" aria-hidden="true">♻</i><b data-v2-legend-recycling></b>';
        const foodItem = doc.createElement('span');
        foodItem.className = 'legend-acceptance-v2';
        foodItem.innerHTML = '<i class="legend-acceptance-v2__fish" role="img" aria-label="Food waste"></i><b data-v2-legend-food></b>';
        legend.append(recyclingItem, foodItem);
        const updateAcceptanceLabels = () => {
          const translations = frame.contentWindow.eval('T');
          const tr = translations[frame.contentDocument.getElementById('lang').value] || translations.en;
          recyclingItem.querySelector('b').textContent = tr.recycling;
          foodItem.querySelector('b').textContent = tr.food;
        };
        updateAcceptanceLabels();
        doc.getElementById('lang').addEventListener('change', () => setTimeout(updateAcceptanceLabels, 0));
      }
      const script = doc.createElement('script');
      script.textContent = `renderFacilityMarkers = (${renderer.toString()}); try { if (map.loaded() && facilities.length) renderFacilityMarkers(); } catch (error) { console.warn('V2 facility markers will render on the next map update', error); }`;
      doc.head.appendChild(script);
    } catch (error) {
      console.error('Could not install V2 facility markers', error);
    }
  };
})();
