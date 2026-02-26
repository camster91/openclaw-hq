import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function GET() {
  try {
    // Check if gateway port is listening
    const isPortOpen = await checkPort('127.0.0.1', 18789);
    if (!isPortOpen) {
      return NextResponse.json({ status: 'offline', output: 'Gateway port not listening' });
    }
    
    // Also check health command
    const { stdout } = await execAsync('openclaw health', { timeout: 5000 });
    return NextResponse.json({ status: 'running', output: stdout.trim() });
  } catch (error: any) {
    // If health command fails but port is open, gateway might be starting
    const isPortOpen = await checkPort('127.0.0.1', 18789);
    if (isPortOpen) {
      return NextResponse.json({ status: 'running', output: 'Gateway port open (health check failed)' });
    }
    return NextResponse.json({ status: 'offline', output: error.message || 'Gateway not responding' });
  }
}
