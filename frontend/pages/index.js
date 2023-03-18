import Link from 'next/link'

function Home() {
  return (
    <>
      <p>Welcome to Ticker Charts</p>
      <ul>
        <li>
          <Link href="/stock">US Stock</Link>
        </li>
        <li>
          <Link href="/finland">Finland</Link>
        </li>
      </ul>
    </>
  )
}

export default Home
