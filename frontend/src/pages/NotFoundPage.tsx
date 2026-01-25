import { Link } from 'react-router-dom';
import Card from '../components/Card';

function NotFoundPage() {
  return (
    <div className="page-container">
      <Card>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/">
          <button className="btn btn-primary">Go Home</button>
        </Link>
      </Card>
    </div>
  );
}

export default NotFoundPage;
