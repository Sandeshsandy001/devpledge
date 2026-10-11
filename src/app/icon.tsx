import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 16,
          background: '#09090b',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          borderRadius: 8,
          border: '1px solid #27272a',
          fontFamily: 'monospace',
          fontWeight: 700,
          position: 'relative',
        }}
      >
        <span style={{ color: '#ffffff' }}>&gt;</span>
        <span style={{ color: '#10b981', marginLeft: 1 }}>_</span>
      </div>
    ),
    {
      ...size,
    }
  );
}
