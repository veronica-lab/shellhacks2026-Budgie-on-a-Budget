// Budgie's map pin (public/pinpoint.png), in place of the 📍 emoji. Sized in em so it takes
// the same space the emoji did at the surrounding font size. Decorative: the text beside it says what it is.
export default function PinIcon() {
  return (
    <img src="/pinpoint.png" alt="" width="1308" height="1497"
      style={{ display: 'inline-block', width: 'auto', height: '1em', verticalAlign: '-0.125em' }} />
  );
}
