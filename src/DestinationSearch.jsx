import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export default function DestinationSearch({ onSelect }) {
  const places = useMapsLibrary('places');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!places || !containerRef.current) return;

    // Google's search box, limited to US places
    const autocomplete = new places.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
    });
    containerRef.current.appendChild(autocomplete);

    autocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      onSelect({
        label: place.displayName,
        address: place.formattedAddress,
        lat: place.location.lat(),
        lng: place.location.lng(),
      });
    });

    return () => autocomplete.remove();
  }, [places, onSelect]);

  return <div ref={containerRef} />;
}