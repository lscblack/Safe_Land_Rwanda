import { Navbar } from '../components/navigation/Navbar'
import { HeroSection } from '../components/hero/heroPageHome'
import { Footer } from '../components/navigation/FooterAll'
import FeaturesSection from '../components/HomePage/AfterHeroSection'

const Home = () => {
  return (
    <>
      <Navbar/>
      <HeroSection/>
      <FeaturesSection/>
      <Footer/>
    </>
  )
}

export default Home
