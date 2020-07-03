import React from 'react';
import {Card, Icon, Image} from 'semantic-ui-react';

interface ArtistCardProps {
  artistImg: {
    url: string,
  },
  artistName: string,
  artistFollowers: {
    total: number
  },
  artistGenre: string,
}

const ArtistCard = ({artistImg, artistName, artistFollowers, artistGenre}: ArtistCardProps) => {
  return (
    <div style={{
      marginTop: '2vh',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <Card>
        <Image src={artistImg.url} wrapped ui={false} />
        <Card.Content>
          <Card.Header>{artistName}</Card.Header>
          <Card.Meta>{artistGenre}</Card.Meta>
          <Card.Description>
            <Icon name='user' />
            {artistFollowers.total} followers
          </Card.Description>
        </Card.Content>
      </Card>
    </div>
  )
}

export default ArtistCard;